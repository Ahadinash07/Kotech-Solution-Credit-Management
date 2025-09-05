import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '../../../../../lib/auth';
import User from '../../../../../models/User';
import CreditLog from '../../../../../models/CreditLog';

interface PurchaseRequest {
  package: 'basic' | 'standard' | 'premium';
  paymentMethod: 'card' | 'wallet' | 'demo';
}

const CREDIT_PACKAGES = {
  basic: { credits: 100, price: 10 },
  standard: { credits: 500, price: 45 },
  premium: { credits: 1000, price: 80 }
};

export async function POST(request: NextRequest) {
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

    const body: PurchaseRequest = await request.json();
    const { package: packageType, paymentMethod } = body;

    if (!CREDIT_PACKAGES[packageType]) {
      return NextResponse.json({ error: 'Invalid package type' }, { status: 400 });
    }

    const user = await User.findByPk(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const creditPackage = CREDIT_PACKAGES[packageType];

    // Simulate payment processing (in real app, integrate with Stripe/PayPal)
    if (paymentMethod === 'demo') {
      // Demo mode - always successful
      const newCredits = user.credits + creditPackage.credits;
      
      await user.update({ credits: newCredits });

      // Log the credit purchase
      await CreditLog.create({
        userId: payload.userId,
        creditsDeducted: -creditPackage.credits, // Negative for credit addition
        remainingCredits: newCredits,
        timestamp: new Date()
      });

      return NextResponse.json({
        success: true,
        message: `Successfully purchased ${creditPackage.credits} credits`,
        newBalance: newCredits,
        transaction: {
          package: packageType,
          credits: creditPackage.credits,
          price: creditPackage.price,
          timestamp: new Date()
        }
      });
    }

    // For real payment methods, you would integrate with payment providers here
    return NextResponse.json({ 
      error: 'Payment processing not implemented for this method' 
    }, { status: 501 });

  } catch (error) {
    console.error('Credit purchase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      packages: CREDIT_PACKAGES,
      paymentMethods: ['demo'], // In production: ['card', 'wallet', 'paypal']
      currency: 'USD'
    });
  } catch (error) {
    console.error('Get packages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
