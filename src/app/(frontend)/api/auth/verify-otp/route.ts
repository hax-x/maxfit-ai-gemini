import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(req: NextRequest) {
  try {
    const { email, otp, userData } = await req.json()

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Find OTP record
    const otpRecords = await payload.find({
      collection: 'otp-verifications',
      where: {
        and: [
          { email: { equals: email } },
          { otp: { equals: otp } },
          { verified: { equals: false } },
        ],
      },
      limit: 1,
    })

    if (otpRecords.docs.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    const otpRecord = otpRecords.docs[0]

    // Check if OTP is expired
    if (new Date() > new Date(otpRecord.expiresAt)) {
      await payload.delete({
        collection: 'otp-verifications',
        id: otpRecord.id,
      })
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 })
    }

    // Mark OTP as verified
    await payload.update({
      collection: 'otp-verifications',
      id: otpRecord.id,
      data: { verified: true },
    })

    // Check if user already exists
    const existingUsers = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
    })

    let user
    if (existingUsers.docs.length > 0) {
      // Update existing user to verified
      user = await payload.update({
        collection: 'users',
        id: existingUsers.docs[0].id,
        data: { emailVerified: true },
      })
    } else {
      // Create new user with verification
      if (!userData) {
        return NextResponse.json({ error: 'User data required for new accounts' }, { status: 400 })
      }

      user = await payload.create({
        collection: 'users',
        data: {
          ...userData,
          email,
          emailVerified: true,
          plan: 'free',
        },
      })
    }

    // Auto-login
    const loginResult = await payload.login({
      collection: 'users',
      data: { email, password: userData?.password },
    })

    // Clean up OTP record
    await payload.delete({
      collection: 'otp-verifications',
      id: otpRecord.id,
    })

    return NextResponse.json({
      success: true,
      user: loginResult.user,
      token: loginResult.token,
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 })
  }
}
