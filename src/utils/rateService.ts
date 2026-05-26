import { Capacitor } from '@capacitor/core';

export interface MetalRates {
  gold24: number;
  gold22: number;
  silver: number;
  lastUpdated?: number;
  source: 'api' | 'ai' | 'cache' | 'fallback' | string;
}

const CACHE_KEY = 'metal_rates_v2';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const HISTORY_KEY = 'metal_rates_history';
const LAST_FETCH_KEY = 'metal_rates_last_raw';

const FALLBACK_RATES: MetalRates = {
  gold24: 15000,
  gold22: 13800,
  silver: 240,
  source: 'fallback'
};

async function getUsdToInr(): Promise<number> {
  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
    if (!res.ok) throw new Error('Currency API failed');
    const data = await res.json();
    if (data && data.usd && data.usd.inr) {
      return data.usd.inr;
    }
    return 83;
  } catch (error) {
    console.warn('Currency API failed, using default USD to INR = 83', error);
    return 83;
  }
}

function parseGeminiJson(text: string): any {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = match ? match[1] : text;
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    throw new Error('Invalid JSON format from AI');
  }
}

async function fetchRatesFromAI(): Promise<MetalRates> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key missing');

  const prompt = "Return today's gold (22K, 24K) and silver rate in India per gram in JSON format only.";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    }
  );

  if (!response.ok) throw new Error('Gemini API failed');

  const data = await response.json();
  const textResponse = data.candidates[0].content.parts[0].text;
  const parsed = parseGeminiJson(textResponse);
  
  const gold24 = parsed.gold24 || parsed.gold_24k || parsed.gold24k || FALLBACK_RATES.gold24;
  const gold22 = parsed.gold22 || parsed.gold_22k || parsed.gold22k || FALLBACK_RATES.gold22;
  const silver = parsed.silver || FALLBACK_RATES.silver;

  return {
    gold24: Math.round(Number(gold24)),
    gold22: Math.round(Number(gold22)),
    silver: parseFloat(Number(silver).toFixed(2)),
    lastUpdated: Date.now(),
    source: 'ai'
  };
}

async function smartFetch(url: string): Promise<any> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (response.ok) return await response.json();
    throw new Error('Direct fetch failed');
  } catch (e) {
    console.warn(`Direct fetch to ${url} failed, trying proxy...`);
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error('Proxy fetch failed');
    const data = await res.json();
    return typeof data.contents === 'string' ? JSON.parse(data.contents) : data;
  }
}

async function fetchRatesFromWeb(): Promise<MetalRates> {
  try {
    const [goldData, silverData] = await Promise.all([
      smartFetch("https://api.gold-api.com/price/XAU"),
      smartFetch("https://api.gold-api.com/price/XAG")
    ]);

    const goldUSD = goldData.price;
    const silverUSD = silverData.price;

    if (!goldUSD || !silverUSD) {
      throw new Error("Missing rate data from Gold-API");
    }

    let finalGoldUSD = goldUSD;
    let finalSilverUSD = silverUSD;
    
    const lastRawStr = localStorage.getItem(LAST_FETCH_KEY);
    if (lastRawStr) {
      try {
        const lastRaw = JSON.parse(lastRawStr);
        finalGoldUSD = (goldUSD + lastRaw.goldUSD) / 2;
        finalSilverUSD = (silverUSD + lastRaw.silverUSD) / 2;
      } catch (e) {}
    }

    localStorage.setItem(LAST_FETCH_KEY, JSON.stringify({ goldUSD, silverUSD, time: Date.now() }));

    const usdToInr = await getUsdToInr();

    const gold24 = (finalGoldUSD / 31.1035) * usdToInr;
    const gold22 = gold24 * 0.916; 
    const silver = (finalSilverUSD / 31.1035) * usdToInr;

    return {
      gold24: Math.round(gold24),
      gold22: Math.round(gold22),
      silver: parseFloat(silver.toFixed(2)),
      lastUpdated: Date.now(),
      source: 'api'
    };
  } catch (error) {
    console.error('Gold-API fetch failed:', error);
    throw error;
  }
}

function storeDailyHistory(rateObj: MetalRates): void {
  if (!rateObj || !rateObj.gold24) return;
  
  const today = new Date().toISOString().split('T')[0];
  try {
    const historyStr = localStorage.getItem(HISTORY_KEY);
    let history = historyStr ? JSON.parse(historyStr) : {};
    
    history[today] = {
      gold24: rateObj.gold24,
      gold22: rateObj.gold22,
      silver: rateObj.silver
    };
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn("Failed to store daily history", e);
  }
}

export async function getLiveRates(forceRefresh: boolean = false): Promise<MetalRates> {
  try {
    const cachedStr = localStorage.getItem(CACHE_KEY);
    const cachedData = cachedStr ? JSON.parse(cachedStr) : null;

    if (cachedData && !forceRefresh) {
      const cacheAge = Date.now() - (cachedData.lastUpdated || 0);
      if (cacheAge < CACHE_EXPIRY_MS) {
        return { ...cachedData, source: 'cache' };
      }
    }

    if (!navigator.onLine) {
      if (cachedData) return { ...cachedData, source: 'cache' };
      return FALLBACK_RATES;
    }

    let liveData: MetalRates;
    try {
      liveData = await fetchRatesFromWeb();
    } catch (apiError) {
      console.warn("Primary metal API failed, falling back to AI", apiError);
      
      if (cachedData) {
        return { ...cachedData, source: 'cache' };
      }
      
      try {
        liveData = await fetchRatesFromAI();
      } catch (aiError) {
        console.error("AI Fallback failed", aiError);
        return FALLBACK_RATES;
      }
    }
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(liveData));
    storeDailyHistory(liveData);
    
    return liveData;
    
  } catch (error) {
    console.error('Catastrophic failure in getLiveRates:', error);
    
    try {
      const cachedStr = localStorage.getItem(CACHE_KEY);
      if (cachedStr) {
        return { ...JSON.parse(cachedStr), source: 'cache' };
      }
    } catch (parseErr) {}
    
    return FALLBACK_RATES;
  }
}

export function getRateForAsset(assetType: string, category: string, rates: MetalRates): number | null {
  if (assetType === 'Silver') {
    return rates.silver;
  }
  
  if (assetType === 'Gold') {
    if (category.includes('24K')) return rates.gold24;
    if (category.includes('22K') || category.includes('KDM')) return rates.gold22;
    if (category.includes('18K')) return rates.gold24 * 0.75;
    return rates.gold22;
  }
  
  return null;
}

export interface AssetMetrics {
  currentValue: number;
  profitLoss: number;
  profitPercentage: number;
  hasLiveRate: boolean;
}

export function calculateAssetMetrics(asset: any, rates: MetalRates): AssetMetrics {
  let currentUnitRate = getRateForAsset(asset.asset_type, asset.category, rates);
  
  let currentValue = 0;
  let hasLiveRate = false;

  if (currentUnitRate && asset.quantity) {
    currentValue = asset.quantity * currentUnitRate;
    hasLiveRate = true;
  } else {
    currentValue = asset.purchase_price || 0;
  }

  const profitLoss = currentValue - (asset.purchase_price || 0);
  const profitPercentage = (asset.purchase_price || 0) > 0 
    ? (profitLoss / asset.purchase_price) * 100 
    : 0;

  return {
    currentValue,
    profitLoss,
    profitPercentage,
    hasLiveRate
  };
}
