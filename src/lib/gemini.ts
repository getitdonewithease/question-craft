/**
 * Google Gemini 1.5 Flash API integration for image-based question extraction
 */

export interface ExtractedQuestion {
  content: string;
  options: Array<{
    label: string;
    content: string;
    isCorrect: boolean;
  }>;
  explanation: string | null;
  topic: string | null;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ✅ NEW (Use this exact line)
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

/**
 * Converts a File or base64 string to base64 data URL
 */
async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extracts base64 data from a data URL
 */
function extractBase64(dataUrl: string): string {
  if (dataUrl.startsWith("data:")) {
    const base64Index = dataUrl.indexOf(",");
    return base64Index !== -1 ? dataUrl.substring(base64Index + 1) : dataUrl;
  }
  return dataUrl;
}

/**
 * Extracts MIME type from a data URL
 */
function extractMimeType(dataUrl: string): string {
  if (dataUrl.startsWith("data:")) {
    const mimeMatch = dataUrl.match(/data:([^;]+)/);
    return mimeMatch ? mimeMatch[1] : "image/png";
  }
  return "image/png";
}

/**
 * Processes images using Google Gemini 1.5 Flash API
 */
export async function extractQuestionsFromImages(
  questionImages: File[],
  answerKeyImage?: File
): Promise<ExtractedQuestion[]> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file."
    );
  }

  if (questionImages.length === 0) {
    throw new Error("At least one question image is required");
  }

  const prompt = `
  You are an expert academic digitization engine.

  I have provided images from a JAMB Past Question paper.

  

  **INPUT CONTEXT:**

  - **Image 1:** Contains the Questions (usually in a 2-column layout).

  - **Image 2 (Optional):** May contain the "Answer Key" (e.g., "1. A, 2. B").

  

  **CRITICAL RULES:**

  1. **Layout:** Read the LEFT column first (top to bottom), THEN the RIGHT column. Do not read across columns.

  2. **Watermarks:** Ignore all website URLs (e.g., myschoolgist.com, schoolngr) and headers.

  3. **Math:** Output all equations in valid LaTeX format (e.g., $\\frac{a}{b}$).

  4. **Grouping:** If questions share a common instruction (e.g., "Passage I" or "Questions 1-5"), include that instruction/passage in the 'content' field for EVERY question it applies to.

  5. **Answers:** If an Answer Key is visible in the images, map the correct option to the question (set 'isCorrect: true').



  **OUTPUT FORMAT:**

  Return a STRICT JSON Array (no markdown blocks).

  [

    {

      "content": "Question text here... [IMAGE REQUIRED if diagram is needed]",

      "options": [

        { "label": "A", "content": "Option text", "isCorrect": false },

        { "label": "B", "content": "Option text", "isCorrect": true }

      ],

      "explanation": "Extract solution explanation if available, else null.",

      "topic": "Subject topic (e.g. Organic Chemistry)"

    }

  ]
  `;

  try {
    // Convert all images to base64
    const imageParts = await Promise.all(
      questionImages.map(async (file) => {
        const dataUrl = await imageToBase64(file);
        return {
          inlineData: {
            data: extractBase64(dataUrl),
            mimeType: extractMimeType(dataUrl),
          },
        };
      })
    );

    // Add answer key image if provided
    if (answerKeyImage) {
      const answerDataUrl = await imageToBase64(answerKeyImage);
      imageParts.push({
        inlineData: {
          data: extractBase64(answerDataUrl),
          mimeType: extractMimeType(answerDataUrl),
        },
      });
    }

    // Prepare the request payload
    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            ...imageParts,
          ],
        },
      ],
    };

    // Make API call
    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
          `Gemini API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Extract text from response
    const textResponse =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!textResponse) {
      throw new Error("No response from Gemini API");
    }

    // Parse JSON from response (handle markdown code blocks if present)
    let jsonText = textResponse.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/g, "").replace(/\n?```$/g, "");
    }

    // Parse the JSON
    const extractedQuestions: ExtractedQuestion[] = JSON.parse(jsonText);

    // Validate and normalize the extracted questions
    return extractedQuestions.map((q, index) => ({
      content: q.content || `Question ${index + 1}`,
      options: (q.options || []).map((opt, optIndex) => ({
        label: opt.label || String.fromCharCode(65 + optIndex), // A, B, C, D...
        content: opt.content || "",
        isCorrect: opt.isCorrect || false,
      })),
      explanation: q.explanation || null,
      topic: q.topic || null,
    }));
  } catch (error) {
    console.error("Error extracting questions from images:", error);
    if (error instanceof SyntaxError) {
      throw new Error(
        "Failed to parse AI response. The image may be unclear or the format may not be recognized."
      );
    }
    throw error;
  }
}



