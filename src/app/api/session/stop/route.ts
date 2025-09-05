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

    const creditService = CreditService.getInstance();

    // Check if user has an active session
    const activeSessionId = await creditService.getActiveSessionId(user.id);
    if (!activeSessionId) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 400 }
      );
    }

    // Stop credit deduction
    await creditService.stopCreditDeduction(user.id);

    // Update session as ended
    const session = await Session.findByPk(activeSessionId);
    if (session) {
      session.endTime = new Date();
      session.isActive = false;
      await session.save();
    }

    return NextResponse.json({
      message: 'Session stopped successfully',
      session: {
        id: session?.id,
        startTime: session?.startTime,
        endTime: session?.endTime,
        creditsConsumed: session?.creditsConsumed,
        isActive: false,
      },
      userCredits: user.credits,
    });

  } catch (error) {
    console.error('Stop session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
