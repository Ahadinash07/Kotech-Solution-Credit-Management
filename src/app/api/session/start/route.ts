import { NextRequest, NextResponse } from 'next/server';
import { User, Session, initDatabase } from '../../../../../models';
import { verifyToken, extractTokenFromHeader } from '../../../../../lib/auth';
import { CreditService } from '../../../../../services/creditService';

export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    
    const authHeader = request.headers.get('authorization') || undefined;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const user = await User.findByPk(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has credits
    if (user.credits <= 0) {
      return NextResponse.json(
        { error: 'Insufficient credits to start session' },
        { status: 400 }
      );
    }

    const creditService = CreditService.getInstance();

    // Force clear any stale sessions before checking
    await creditService.stopCreditDeduction(user.id);

    // Check if user has any active database sessions and end them
    const existingSession = await Session.findOne({
      where: { userId: user.id, isActive: true }
    });
    
    if (existingSession) {
      existingSession.isActive = false;
      existingSession.endTime = new Date();
      await existingSession.save();
    }

    // Create new session
    const session = await Session.create({
      userId: user.id,
      startTime: new Date(),
      creditsConsumed: 0,
      isActive: true,
    });

    // Start credit deduction
    await creditService.startCreditDeduction(user.id, session.id);

    return NextResponse.json({
      message: 'Session started successfully',
      session: {
        id: session.id,
        startTime: session.startTime,
        creditsConsumed: session.creditsConsumed,
        isActive: session.isActive,
      },
      userCredits: user.credits,
    });

  } catch (error) {
    console.error('Start session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
