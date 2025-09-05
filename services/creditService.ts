import { User, Session, CreditLog } from '../models';
import redis from '../lib/redis';

export class CreditService {
  private static instance: CreditService;
  private activeIntervals: Map<number, NodeJS.Timeout> = new Map();

  static getInstance(): CreditService {
    if (!CreditService.instance) {
      CreditService.instance = new CreditService();
    }
    return CreditService.instance;
  }

  // Initialize intervals from Redis on startup - DISABLED to prevent auto-start
  async initializeFromRedis(): Promise<void> {
    // Disabled automatic session restoration to prevent credits deducting without user action
    console.log('Credit service initialized - automatic session restoration disabled');
  }

  async startCreditDeduction(userId: number, sessionId: number): Promise<void> {
    // Stop any existing deduction for this user
    await this.stopCreditDeduction(userId);

    console.log(`Starting credit deduction for user ${userId}, session ${sessionId}`);

    // Store active session in Redis with timestamp
    await redis.set(`active_session:${userId}`, JSON.stringify({
      sessionId,
      startTime: Date.now()
    }));

    // Start deducting 1 credit every 6 seconds (10 credits per minute)
    const interval = setInterval(async () => {
      // Check if session is still active in Redis before deducting
      const sessionData = await redis.get(`active_session:${userId}`);
      if (!sessionData) {
        console.log(`Session no longer active for user ${userId}, stopping deduction`);
        this.stopCreditDeduction(userId);
        return;
      }
      await this.deductCredit(userId, sessionId);
    }, 6000); // 6 seconds = 1 credit deduction

    this.activeIntervals.set(userId, interval);
    console.log(`Set interval for user ${userId}, total active intervals:`, this.activeIntervals.size);
  }

  async stopCreditDeduction(userId: number): Promise<void> {
    const interval = this.activeIntervals.get(userId);
    console.log(`Stopping credit deduction for user ${userId}, interval exists:`, !!interval);
    
    if (interval) {
      clearInterval(interval);
      this.activeIntervals.delete(userId);
      console.log(`Cleared interval for user ${userId}`);
    } else {
      console.log(`No active interval found for user ${userId}`);
    }

    // Remove from Redis
    await redis.del(`active_session:${userId}`);
    console.log(`Removed active session from Redis for user ${userId}`);
  }

  private async deductCredit(userId: number, sessionId: number): Promise<void> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        this.stopCreditDeduction(userId);
        return;
      }

      // Check if user has credits
      if (user.credits <= 0) {
        await this.endSession(userId, sessionId);
        return;
      }

      // Deduct 1 credit
      user.credits -= 1;
      await user.save();

      // Update session credits consumed
      const session = await Session.findByPk(sessionId);
      if (session) {
        session.creditsConsumed += 1;
        await session.save();
      }

      // Log the credit deduction
      await CreditLog.create({
        userId,
        sessionId,
        creditsDeducted: 1,
        remainingCredits: user.credits,
        timestamp: new Date(),
      });

      // Broadcast credit update via WebSocket (will be implemented)
      await this.broadcastCreditUpdate(userId, user.credits);

      // If credits reach zero, end the session
      if (user.credits <= 0) {
        await this.endSession(userId, sessionId);
      }

    } catch (error) {
      console.error('Error deducting credit:', error);
    }
  }

  private async endSession(userId: number, sessionId: number): Promise<void> {
    try {
      // Stop credit deduction
      this.stopCreditDeduction(userId);

      // Update session as ended
      const session = await Session.findByPk(sessionId);
      if (session) {
        session.endTime = new Date();
        session.isActive = false;
        await session.save();
      }

      // Broadcast session end
      await this.broadcastSessionEnd(userId);

    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  async getUserCredits(userId: number): Promise<number> {
    const user = await User.findByPk(userId);
    return user?.credits || 0;
  }

  async isUserInActiveSession(userId: number): Promise<boolean> {
    const activeSession = await redis.get(`active_session:${userId}`);
    return activeSession !== null;
  }

  async getActiveSessionId(userId: number): Promise<number | null> {
    const sessionData = await redis.get(`active_session:${userId}`);
    if (!sessionData) return null;
    
    try {
      const parsed = JSON.parse(sessionData);
      return parsed.sessionId || null;
    } catch {
      // Handle legacy format (just sessionId as string)
      return parseInt(sessionData) || null;
    }
  }

  private async broadcastCreditUpdate(userId: number, credits: number): Promise<void> {
    // This will be implemented with WebSocket
    // For now, we'll store the update in Redis for the WebSocket server to pick up
    await redis.publish('credit_update', JSON.stringify({ userId, credits }));
  }

  private async broadcastSessionEnd(userId: number): Promise<void> {
    // This will be implemented with WebSocket
    await redis.publish('session_end', JSON.stringify({ userId }));
  }
}
