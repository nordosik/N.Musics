import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { obsideoClient, OBSIDEO_BUCKET } from '../../lib/obsideo';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');
        const range = request.headers.get('range'); // Получаем заголовок Range от браузера

        if (!key) {
            return NextResponse.json({ error: 'No key provided' }, { status: 400 });
        }

        const command = new GetObjectCommand({
            Bucket: OBSIDEO_BUCKET,
            Key: key,
            Range: range || undefined, // Передаем Range в Obsideo, если он есть
        });

        const response = await obsideoClient.send(command);

        if (!response.Body) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const bytes = await response.Body.transformToByteArray();
        const buffer = Buffer.from(bytes);

        // Формируем заголовки ответа
        const headers: HeadersInit = {
            'Content-Type': response.ContentType || 'application/octet-stream',
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable', // <--- ДОБАВИТЬ ЭТО
        };

        // Если это частичный контент (Range), возвращаем статус 206 и нужные заголовки
        if (response.ContentRange) {
            headers['Content-Range'] = response.ContentRange;
            headers['Content-Length'] = String(buffer.length);
            headers['Cache-Control'] = 'public, max-age=31536000, immutable'; // <--- ДОБАВИТЬ ЭТО
            return new NextResponse(buffer, {
                status: 206,
                headers,
            });
        }

        // Если это полный файл, возвращаем 200
        headers['Content-Length'] = String(buffer.length);
        return new NextResponse(buffer, {
            status: 200,
            headers,
        });
    } catch (error: any) {
        console.error('Media fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}