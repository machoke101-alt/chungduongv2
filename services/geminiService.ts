
import { GoogleGenAI } from "@google/genai";
import { LOCAL_LOCATIONS } from "./locationData";

/**
 * Tìm kiếm địa chỉ hành chính từ bộ nhớ cục bộ (Hà Nội & Giao Thủy)
 */
export const searchPlaces = async (query: string) => {
  if (!query || query.length < 1) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  const matches = LOCAL_LOCATIONS.filter(loc => 
    loc.name.toLowerCase().includes(normalizedQuery) || 
    loc.shortName.toLowerCase().includes(normalizedQuery)
  );

  return matches.slice(0, 6).map(item => ({
    name: item.name,
    shortName: item.shortName,
    uri: `https://www.google.com/maps/search/${encodeURIComponent(item.name)}`
  }));
};

/**
 * Phân tích lộ trình sử dụng Gemini AI
 */
export const getRouteDetails = async (origin: string, destination: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Phân tích quãng đường và thời gian lái xe dự kiến từ "${origin}" đến "${destination}" tại Việt Nam. Trả về thông tin theo định dạng JSON: {"distance": "X km", "duration_text": "Y phút/giờ", "duration_minutes": Z}. Z là tổng số phút dự kiến.`,
      config: {
        systemInstruction: "Bạn là chuyên gia bản đồ. Hãy đưa ra ước tính chính xác dưới dạng JSON.",
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { error: "Không thể tính toán lộ trình." };
  }
};

export const chatWithAssistant = async (message: string, context: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Context: ${context}\n\nUser: ${message}`,
      config: {
        systemInstruction: "Bạn là trợ lý TripEase. Trả lời ngắn gọn, tập trung vào giá xe và lộ trình tại Việt Nam. Sử dụng tông màu Xanh Phỉ Thuý trong giao tiếp."
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Xin lỗi, tôi đang gặp khó khăn khi kết nối. Bạn vui lòng thử lại sau nhé!";
  }
};
