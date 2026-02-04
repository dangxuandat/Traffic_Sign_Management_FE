import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface DetectionResult {
  type: string;
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

export interface AiDetectionResponse {
  signs: DetectionResult[];
  processingTimeMs: number;
}

@Injectable()
export class AiDetectionService {
  private readonly apiUrl: string;
  private readonly apiToken: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('HUGGINGFACE_API_URL') ?? '';
    this.apiToken = this.configService.get<string>('HUGGINGFACE_API_TOKEN') ?? '';
  }

  async detectTrafficSigns(imageBuffer: Buffer): Promise<AiDetectionResponse> {
    const startTime = Date.now();

    try {
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');

      const response = await axios.post(
        `${this.apiUrl}/api/detect`,
        {
          image: base64Image,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiToken}`,
          },
          timeout: 30000, // 30 second timeout
        },
      );

      const processingTimeMs = Date.now() - startTime;

      return {
        signs: response.data.signs || [],
        processingTimeMs,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new HttpException(
            'AI detection timed out',
            HttpStatus.GATEWAY_TIMEOUT,
          );
        }
        throw new HttpException(
          `AI detection failed: ${error.message}`,
          HttpStatus.BAD_GATEWAY,
        );
      }
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
