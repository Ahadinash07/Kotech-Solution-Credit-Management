import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '../../../../../lib/auth';
import Session from '../../../../../models/Session';
import CreditLog from '../../../../../models/CreditLog';
import { Op } from 'sequelize';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader || undefined);

    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get user's session history
    const sessions = await Session.findAndCountAll({
      where: { userId: payload.userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    // Get total credits consumed
    const totalCreditsConsumed = await Session.sum('creditsConsumed', {
      where: { userId: payload.userId }
    }) || 0;

    // Get total session time
    const completedSessions = await Session.findAll({
      where: { 
        userId: payload.userId,
        isActive: false,
  endTime: { [Op.not]: null as unknown as Date }
      }
    });

    const totalSessionTime = completedSessions.reduce((total, session) => {
      if (session.startTime && session.endTime) {
        const duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
        return total + Math.floor(duration / 1000); // in seconds
      }
      return total;
    }, 0);

    // Get recent credit logs
    const recentCreditLogs = await CreditLog.findAll({
      where: { userId: payload.userId },
      order: [['timestamp', 'DESC']],
      limit: 20
    });

    return NextResponse.json({
      sessions: sessions.rows,
      pagination: {
        page,
        limit,
        total: sessions.count,
        totalPages: Math.ceil(sessions.count / limit)
      },
      analytics: {
        totalSessions: sessions.count,
        totalCreditsConsumed,
        totalSessionTime,
        averageSessionDuration: sessions.count > 0 ? Math.floor(totalSessionTime / sessions.count) : 0,
        averageCreditsPerSession: sessions.count > 0 ? Math.floor(totalCreditsConsumed / sessions.count) : 0
      },
      recentCreditLogs
    });

  } catch (error) {
    console.error('Session history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
