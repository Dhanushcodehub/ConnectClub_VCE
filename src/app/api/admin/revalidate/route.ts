import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paths } = body;
    
    if (!paths || !Array.isArray(paths)) {
      return NextResponse.json({ error: "Missing or invalid 'paths' array in request body." }, { status: 400 });
    }

    paths.forEach(path => {
      revalidatePath(path);
      console.log(`[Next.js Cache] Revalidated path: ${path}`);
    });

    return NextResponse.json({ success: true, revalidatedPaths: paths });
  } catch (error) {
    console.error("Error revalidating cache:", error);
    return NextResponse.json({ error: "Failed to revalidate cache." }, { status: 500 });
  }
}
