import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { obsideoClient, OBSIDEO_BUCKET } from '../../lib/obsideo';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const key = formData.get('key') as string;

        if (!file || !key) {
            return NextResponse.json({ error: 'No file or key provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        await obsideoClient.send(new PutObjectCommand({
            Bucket: OBSIDEO_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: file.type,
            Metadata: { encrypt: 'false' },
        }));

        return NextResponse.json({ success: true, key });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}