import * as crypto from 'crypto'
import * as https from 'https'

import { CopilotRequest, ErrorResponse, HistoryMessage, Message, TokenResponse } from './../copilot/type'

export const generateAskRequest = (history: HistoryMessage[]): Promise<any> => {
  return Promise.resolve({
    intent: true,
    // model: 'gpt-4.1',
    model: 'claude-sonnet-4',
    n: 1,
    stream: true,
    temperature: 0.1,
    top_p: 1,
    messages: history,
    history: history,
    max_tokens: 8192
  })
}

const getToken = (): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/copilot_internal/v2/token',
      method: 'GET',
      headers: {
        Authorization: `token ${process.env.COPILOT_TOKEN}`,
        Accept: 'application/json',
        'Editor-Version': 'vscode/1.85.1',
        'Editor-Plugin-Version': 'copilot-chat/0.12.2023120701',
        'User-Agent': 'GitHubCopilotChat/0.12.2023120701'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        const tokenResponse: TokenResponse = JSON.parse(data)
        resolve(tokenResponse.token)
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.end()
  })
}

const uuid = (): string => {
  return crypto.randomUUID()
}

const machineID = (): string => {
  return crypto.randomBytes(32).toString('hex')
}

const sessionID = (): string => {
  return uuid() + Date.now().toString()
}

const jsonParse = (s: string): any => {
  try {
    return JSON.parse(s)
  } catch (err) {
    return null
  }
}

const removeUntilData = (s: string): string => {
  const index = s.indexOf('data:')
  return index === -1 ? s : s.substring(index + 'data: '.length)
}

export const parseResponse = (
  data: string,
  callback: (response: string, done: boolean, isError: boolean) => void
): string => {
  const lines = data.split('\n')
  let isError = false
  let reply = ''

  for (const line of lines) {
    const s = line.trim()

    if (s.startsWith('{"error":')) {
      const error: ErrorResponse = JSON.parse(s)
      reply = error.error.message
      isError = true
      break
    }

    if (s.includes('[DONE]')) {
      break
    }

    if (!s.startsWith('data:')) {
      continue
    }

    const jsonExtract = removeUntilData(s)
    const message: Message = jsonParse(jsonExtract)

    if (message.choices.length > 0 && message.choices[0].delta.content) {
      const txt = message.choices[0].delta.content as string
      reply += txt
      callback(reply, false, isError)
    }
  }

  callback(reply, true, isError)
  return reply
}

export const generateCopilotRequest = async (): Promise<CopilotRequest> => {
  const token = await getToken()
  return {
    token,
    sessionId: sessionID(),
    uuid: uuid(),
    machineId: machineID()
  }
}

export const askCopilotQuestion = async (question: string): Promise<string> => {
  try {
    const copilotRequest = await generateCopilotRequest()

    const history: HistoryMessage[] = [
      {
        role: 'user',
        content: question
      }
    ]

    const requestBody = await generateAskRequest(history)

    return new Promise<string>((resolve, reject) => {
      const postData = JSON.stringify(requestBody)

      const options = {
        hostname: 'api.githubcopilot.com',
        path: '/chat/completions',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${copilotRequest.token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          Accept: 'text/event-stream',
          'Editor-Version': 'vscode/1.85.1',
          'Editor-Plugin-Version': 'copilot-chat/0.12.2023120701',
          'User-Agent': 'GitHubCopilotChat/0.12.2023120701',
          'Copilot-Integration-Id': 'vscode-chat',
          'X-Request-Id': copilotRequest.uuid,
          'Vscode-Sessionid': copilotRequest.sessionId,
          'Vscode-Machineid': copilotRequest.machineId
        }
      }

      const req = https.request(options, (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          try {
            parseResponse(data, (response: string, done: boolean, isError: boolean) => {
              if (done) {
                if (isError) {
                  reject(new Error(response))
                } else {
                  resolve(response)
                }
              }
            })
          } catch (error) {
            reject(error)
          }
        })
      })

      req.on('error', (error) => {
        reject(error)
      })

      req.write(postData)
      req.end()
    })
  } catch (error) {
    throw new Error(`Failed to ask Copilot: ${error}`)
  }
}

// Create a curl command equivalent for testing
export const generateCopilotCurlCommand = async (question: string): Promise<string> => {
  const copilotRequest = await generateCopilotRequest()

  const history: HistoryMessage[] = [
    {
      role: 'user',
      content: question
    }
  ]

  const requestBody = await generateAskRequest(history)
  const postData = JSON.stringify(requestBody, null, 2)

  return `curl -X POST "https://api.githubcopilot.com/chat/completions" \\
  -H "Authorization: Bearer ${copilotRequest.token}" \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream" \\
  -H "Editor-Version: vscode/1.85.1" \\
  -H "Editor-Plugin-Version: copilot-chat/0.12.2023120701" \\
  -H "User-Agent: GitHubCopilotChat/0.12.2023120701" \\
  -H "Copilot-Integration-Id: vscode-chat" \\
  -H "X-Request-Id: ${copilotRequest.uuid}" \\
  -H "Vscode-Sessionid: ${copilotRequest.sessionId}" \\
  -H "Vscode-Machineid: ${copilotRequest.machineId}" \\
  -d '${postData.replace(/'/g, "'\\''")}' \\
  --no-buffer`
}
