/**
 * ElevenLabs TTS API Integration for AdBurst Factory
 * Handles text-to-speech conversion for ad voiceovers
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Default voice ID - professional male voice
// In production, this could be configurable or selected based on the ad content
const DEFAULT_VOICE_ID = 'ErXwobaYiN019PkySvjV'; // Antoni - warm, friendly male voice

/**
 * Generate speech audio from text using ElevenLabs' TTS API
 * 
 * @param text The text to convert to speech
 * @returns Path to the generated audio file
 */
export async function textToSpeech(text: string): Promise<string> {
  console.log(`Converting text to speech with ElevenLabs: "${text}"`);
  
  try {
    // Prepare the output directory
    const outputDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `voice-${uuidv4()}.mp3`);
    
    // Make a real API call to ElevenLabs
    
    // API request configuration
    const requestConfig = {
      method: 'post',
      url: `${ELEVENLABS_API_URL}/${DEFAULT_VOICE_ID}`,
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      data: {
        text: text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 1.0, // Maximum style to get an engaging advertisement voice
          use_speaker_boost: true
        }
      },
      responseType: 'arraybuffer' as 'arraybuffer'
    };
    
    // Execute actual API call to ElevenLabs
    console.log('Calling ElevenLabs API with:', { text, voiceId: DEFAULT_VOICE_ID });
    
    // Make the real API call
    const response = await axios(requestConfig);
    
    // Save the actual audio data
    fs.writeFileSync(outputPath, response.data);
    
    console.log(`Audio generated (placeholder): ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error generating speech with ElevenLabs:', error);
    throw new Error(`Failed to generate speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}