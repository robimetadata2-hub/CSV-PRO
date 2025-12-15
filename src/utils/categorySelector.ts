
// Utility to determine the most appropriate video category based on content analysis

export interface VideoCategory {
  id: number;
  name: string;
}

export const videoCategories: VideoCategory[] = [
  { id: 1, name: "Animals" },
  { id: 2, name: "Buildings and Architecture" },
  { id: 3, name: "Business" },
  { id: 4, name: "Drinks" },
  { id: 5, name: "The Environment" },
  { id: 6, name: "States of Mind" },
  { id: 7, name: "Food" },
  { id: 8, name: "Graphic Resources" },
  { id: 9, name: "Hobbies and Leisure" },
  { id: 10, name: "Industry" },
  { id: 11, name: "Landscapes" },
  { id: 12, name: "Lifestyle" },
  { id: 13, name: "People" },
  { id: 14, name: "Plants and Flowers" },
  { id: 15, name: "Culture and Religion" },
  { id: 16, name: "Science" },
  { id: 17, name: "Social Issues" },
  { id: 18, name: "Sports" },
  { id: 19, name: "Technology" },
  { id: 20, name: "Transport" },
  { id: 21, name: "Travel" }
];

// Category keywords mapping for content analysis
const categoryKeywords: Record<number, string[]> = {
  1: ["animal", "wildlife", "pet", "zoo", "dog", "cat", "bird", "fish", "fauna", "tiger", "lion", "elephant"],
  2: ["building", "architecture", "structure", "house", "apartment", "skyscraper", "office", "construction", "tower", "bridge", "monument"],
  3: ["business", "office", "corporate", "meeting", "professional", "commerce", "management", "executive", "finance", "marketing", "startup"],
  4: ["drink", "beverage", "coffee", "tea", "juice", "water", "cocktail", "wine", "beer", "alcohol", "smoothie", "soda"],
  5: ["environment", "nature", "ecosystem", "conservation", "planet", "earth", "green", "sustainable", "climate", "pollution"],
  6: ["mind", "emotion", "feeling", "mental", "psychology", "mood", "thought", "dream", "meditation", "consciousness", "awareness"],
  7: ["food", "meal", "dish", "cuisine", "cooking", "restaurant", "recipe", "ingredient", "culinary", "gourmet", "breakfast", "dinner"],
  8: ["graphic", "design", "illustration", "vector", "template", "pattern", "texture", "abstract", "digital art", "wallpaper", "background"],
  9: ["hobby", "leisure", "entertainment", "recreation", "pastime", "game", "fun", "activity", "craft", "collecting", "diy"],
  10: ["industry", "factory", "manufacturing", "production", "industrial", "machinery", "assembly", "automation", "process", "engineering"],
  11: ["landscape", "scenery", "vista", "panorama", "horizon", "outdoor", "mountain", "valley", "field", "sky", "ocean", "sea"],
  12: ["lifestyle", "living", "daily", "routine", "wellness", "health", "habit", "fashion", "home", "family", "community"],
  13: ["people", "person", "human", "individual", "crowd", "group", "portrait", "face", "woman", "man", "child", "family"],
  14: ["plant", "flower", "tree", "garden", "botanical", "floral", "leaf", "bloom", "vegetation", "forest", "jungle", "grass"],
  15: ["culture", "religion", "tradition", "belief", "ritual", "ceremony", "heritage", "worship", "spiritual", "faith", "festival"],
  16: ["science", "research", "laboratory", "experiment", "academic", "study", "discovery", "scientific", "chemistry", "physics", "biology"],
  17: ["social", "issue", "problem", "cause", "awareness", "inequality", "justice", "activism", "rights", "protest", "movement"],
  18: ["sport", "athlete", "game", "competition", "team", "fitness", "exercise", "training", "match", "tournament", "olympics", "champion"],
  19: ["technology", "digital", "electronic", "computer", "device", "gadget", "innovation", "tech", "software", "hardware", "internet", "ai"],
  20: ["transport", "vehicle", "car", "train", "plane", "bus", "bicycle", "boat", "travel", "traffic", "highway", "airport"],
  21: ["travel", "tourism", "vacation", "destination", "trip", "journey", "explore", "tourist", "hotel", "resort", "landmark", "sightseeing"]
};

/**
 * Determine the most appropriate video category based on content analysis
 * @param title The video title
 * @param description The video description (if available)
 * @param keywords The video keywords
 * @returns The category ID (1-21)
 */
export function determineVideoCategory(title: string = '', description: string = '', keywords: string[] = []): number {
  // Default to "Graphic Resources" (8) if we can't determine a category for abstract backgrounds
  const defaultCategory = 8;
  
  if (!title && keywords.length === 0) return defaultCategory;
  
  // Combine all text for analysis
  const allContent = `${title.toLowerCase()} ${description.toLowerCase()} ${keywords.join(' ').toLowerCase()}`;
  
  // Score each category based on keyword matches
  const categoryScores: Record<number, number> = {};
  
  // Initialize scores for all categories
  videoCategories.forEach(category => {
    categoryScores[category.id] = 0;
  });
  
  // Calculate scores
  Object.entries(categoryKeywords).forEach(([categoryId, keywords]) => {
    const id = parseInt(categoryId);
    keywords.forEach(keyword => {
      // Count occurrences of the keyword
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = allContent.match(regex);
      if (matches) {
        categoryScores[id] += matches.length;
        
        // Give extra weight to keywords in title
        if (title.toLowerCase().match(new RegExp(`\\b${keyword}\\b`, 'gi'))) {
          categoryScores[id] += 3;
        }
      }
    });
  });
  
  // Special cases for common backgrounds and graphics
  if (allContent.includes('background') || 
      allContent.includes('texture') || 
      allContent.includes('pattern') ||
      allContent.includes('wallpaper') ||
      allContent.includes('abstract')) {
    categoryScores[8] += 5; // Boost Graphic Resources for backgrounds
  }
  
  // Find category with highest score
  let bestCategory = defaultCategory;
  let highestScore = 0;
  
  Object.entries(categoryScores).forEach(([categoryId, score]) => {
    if (score > highestScore) {
      highestScore = score;
      bestCategory = parseInt(categoryId);
    }
  });
  
  return bestCategory;
}

/**
 * Get category name by its ID
 * @param id The category ID
 * @returns The category name
 */
export function getCategoryNameById(id: number): string {
  const category = videoCategories.find(cat => cat.id === id);
  return category ? category.name : "Graphic Resources"; // Default to "Graphic Resources" if not found
}
