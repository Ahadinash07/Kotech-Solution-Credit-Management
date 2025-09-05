import { NextRequest, NextResponse } from 'next/server';
import { User, Session, initDatabase } from '../../../../../models';
import { verifyToken, extractTokenFromHeader } from '../../../../../lib/auth';
import { CreditService } from '../../../../../services/creditService';

export async function GET(request: NextRequest) {
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
    const activeSessionId = await creditService.getActiveSessionId(user.id);
    
    let activeSession = null;
    if (activeSessionId) {
      activeSession = await Session.findByPk(activeSessionId);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        credits: user.credits,
      },
      activeSession: activeSession ? {
        id: activeSession.id,
        startTime: activeSession.startTime,
        creditsConsumed: activeSession.creditsConsumed,
        isActive: activeSession.isActive,
      } : null,
    });

  } catch (error) {
    console.error('Session status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
