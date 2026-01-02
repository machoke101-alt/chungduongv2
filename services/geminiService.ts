
import { GoogleGenAI } from "@google/genai";
import { LOCAL_LOCATIONS } from "./locationData";

/**
 * Kiểm tra xem API Key đã được cấu hình hay chưa
 */
const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "undefined") {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Lỗi khởi tạo Gemini:", e);
    return null;
  }
};

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

export const getRouteDetails = async (origin: string, destination: string) => {
  const ai = getAIInstance();
  if (!ai) return { text: "⚠️ Tính năng AI chưa được cấu hình API Key.", links: [] };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Phân tích lộ trình từ "${origin}" đến "${destination}". Tính quãng đường và thời gian dự kiến.`,
      config: { tools: [{ googleSearch: {} }] },
    });
    return { text: response.text, links: [] };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Có lỗi xảy ra khi phân tích lộ trình.", links: [] };
  }
};

export const chatWithAssistant = async (message: string, context: string) => {
  const ai = getAIInstance();
  if (!ai) return "Cấu hình API Key bị thiếu. Vui lòng kiểm tra lại môi trường hệ thống.";

  try {
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
    return "Xin lỗi, tôi đang gặp khó khăn khi kết nối với máy chủ AI.";
  }
};
