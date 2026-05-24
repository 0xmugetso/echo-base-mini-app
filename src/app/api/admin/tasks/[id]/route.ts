import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '../../../../../lib/db';
import Task from '../../../../../models/Task';

async function checkAdminAuth() {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token')?.value;
    return adminToken === 'admin_session_active';
}

export async function PUT(request: Request, context: { params: any }) {
    if (!(await checkAdminAuth())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await context.params;
        await dbConnect();
        
        const body = await request.json();
        const { title, description, actionLink, buttonType, weight, points, timeSpan, conditions, isActive, actionType, actionTarget, actionSubtype } = body;

        const updatedTask = await Task.findByIdAndUpdate(
            id,
            {
                title,
                description,
                actionLink: actionLink || '',
                buttonType: buttonType || 'button',
                weight: Number(weight) || 0,
                points: Number(points) || 0,
                timeSpan: {
                    type: timeSpan?.type || 'infinite',
                    deadline: timeSpan?.deadline ? new Date(timeSpan.deadline) : null
                },
                conditions: conditions || [],
                isActive: isActive !== undefined ? isActive : true,
                actionType: actionType || 'claim',
                actionTarget: actionTarget || '',
                actionSubtype: actionSubtype || ''
            },
            { new: true }
        );

        if (!updatedTask) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, task: updatedTask });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: any }) {
    if (!(await checkAdminAuth())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await context.params;
        await dbConnect();

        const deletedTask = await Task.findByIdAndDelete(id);

        if (!deletedTask) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Task deleted successfully' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
