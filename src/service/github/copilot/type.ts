export interface TokenResponse {
  token: string
}

export interface Message {
  choices: Array<{
    finish_reason: string
    index: number
    content_filter_offsets: {
      check_offset: number
      start_offset: number
      end_offset: number
    }
    content_filter_results: {
      hate: {
        filtered: boolean
        severity: string
      }
      self_harm: {
        filtered: boolean
        severity: string
      }
      sexual: {
        filtered: boolean
        severity: string
      }
      violence: {
        filtered: boolean
        severity: string
      }
    }
    delta: {
      content: any
      role: any
    }
  }>
  created: number
  id: string
}

export interface ErrorDetails {
  code: string
  message: string
  param: string
  type: string
}

export interface ErrorResponse {
  error: ErrorDetails
}

export interface CopilotRequest {
  token: string
  sessionId: string
  uuid: string
  machineId: string
}

export interface HistoryMessage {
  role: string
  content: string
}

export interface Request {
  intent: boolean
  model: string
  n: number
  stream: boolean
  temperature: number
  top_p: number
  messages: HistoryMessage[]
  history: HistoryMessage[]
  max_tokens: number
}

export type CopilotQueryBuilder = {
  copilotRequest: CopilotRequest | null
  history: {
    role: string
    content: string
  }[]
}
