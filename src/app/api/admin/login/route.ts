import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token')?.value;

    if (adminToken === 'admin_session_active') {
        return NextResponse.json({ authenticated: true });
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
}

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

        if (username === adminUsername && password === adminPassword) {
            const response = NextResponse.json({ success: true, message: 'Logged in successfully' });
            
            // Set cookie for session persistence
            response.headers.append(
                'Set-Cookie',
                'admin_token=admin_session_active; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax'
            );

            return response;
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE() {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    
    // Clear cookie
    response.headers.append(
        'Set-Cookie',
        'admin_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax'
    );

    return response;
}
