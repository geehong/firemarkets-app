
import { useState } from "react";

export function useSentiment() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyzeText = async () => {
    if (!inputText.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/analysis/sentiment?text=${encodeURIComponent(inputText)}`);
      const data = await response.json();
      setResult(data);
    } catch (e) {
      console.error("Error analyzing text", e);
    } finally {
      setLoading(false);
    }
  };

  return { inputText, setInputText, result, loading, analyzeText };
}
