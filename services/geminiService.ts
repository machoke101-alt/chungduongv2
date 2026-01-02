
import { GoogleGenAI, Type } from "@google/genai";
import { LOCAL_LOCATIONS } from "./locationData";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Tìm kiếm địa chỉ hành chính từ bộ nhớ cục bộ (Hà Nội & Giao Thủy)
 * Tốc độ xử lý: < 1ms
 */
export const searchPlaces = async (query: string) => {
  if (!query || query.length < 1) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  // Lọc từ dữ liệu cục bộ đã nạp sẵn
  const matches = LOCAL_LOCATIONS.filter(loc => 
    loc.name.toLowerCase().includes(normalizedQuery) || 
    loc.shortName.toLowerCase().includes(normalizedQuery)
  );

  // Trả về tối đa 6 kết quả phù hợp nhất
  return matches.slice(0, 6).map(item => ({
    name: item.name,
    shortName: item.shortName,
    uri: `https://www.google.com/maps/search/${encodeURIComponent(item.name)}`
  }));
};

export const getRouteDetails = async (origin: string, destination: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Phân tích lộ trình từ "${origin}" đến "${destination}". Tính quãng đường và thời gian dự kiến.`,
      config: { tools: [{ googleMaps: {} }] },
    });
    return { text: response.text, links: [] };
  } catch (error) {
    return null;
  }
};

export const chatWithAssistant = async (message: string, context: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Context: ${context}\n\nUser: ${message}`,
      config: {
        systemInstruction: "Bạn là trợ lý TripEase. Trả lời ngắn gọn, tập trung vào giá xe và lộ trình tại Việt Nam."
      }
    });
    return response.text;
  } catch (error) {
    return "Xin lỗi, tôi đang bận một chút.";
  }
};
