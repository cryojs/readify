export const GET_SELECTED_TEXT_MESSAGE = "GET_SELECTED_TEXT"
export const REPLACE_SELECTED_TEXT_MESSAGE = "REPLACE_SELECTED_TEXT"
export const SIMPLIFY_SELECTION_REQUEST_MESSAGE = "SIMPLIFY_SELECTION_REQUEST"
export const OPEN_FOLLOW_UP_MESSAGE = "OPEN_FOLLOW_UP"
export const FOLLOW_UP_SELECTION_REQUEST_MESSAGE = "FOLLOW_UP_SELECTION_REQUEST"
export const SIMPLIFY_STATUS_MESSAGE = "SIMPLIFY_STATUS"

export type SelectedTextAction = "simplify" | "shorten"

export type GetSelectedTextMessage = {
  type: typeof GET_SELECTED_TEXT_MESSAGE
}

export type ReplaceSelectedTextMessage = {
  type: typeof REPLACE_SELECTED_TEXT_MESSAGE
  selectionId: number
  text: string
  action?: SelectedTextAction
}

export type SimplifySelectionRequestMessage = {
  type: typeof SIMPLIFY_SELECTION_REQUEST_MESSAGE
  action?: SelectedTextAction
}

export type OpenFollowUpMessage = {
  type: typeof OPEN_FOLLOW_UP_MESSAGE
}

export type FollowUpSelectionRequestMessage = {
  type: typeof FOLLOW_UP_SELECTION_REQUEST_MESSAGE
  selectedText: string
  question: string
}

export type SimplifyStatusMessage = {
  type: typeof SIMPLIFY_STATUS_MESSAGE
  status: "loading" | "success" | "error"
  message?: string
}

export type SelectedTextResponse = {
  text: string | null
  selectionId: number | null
}

export type ReplaceSelectedTextResponse = {
  replaced: boolean
  error?: string
}

export type SimplifySelectionResponse = {
  accepted: boolean
  error?: string
}

export type FollowUpSelectionResponse = {
  accepted: boolean
  answer?: string
  error?: string
}

export function isGetSelectedTextMessage(
  message: unknown,
): message is GetSelectedTextMessage {
  return isMessageOfType(message, GET_SELECTED_TEXT_MESSAGE)
}

export function isReplaceSelectedTextMessage(
  message: unknown,
): message is ReplaceSelectedTextMessage {
  return (
    isMessageOfType(message, REPLACE_SELECTED_TEXT_MESSAGE) &&
    typeof (message as { selectionId?: unknown }).selectionId === "number" &&
    typeof (message as { text?: unknown }).text === "string" &&
    isOptionalSelectedTextAction((message as { action?: unknown }).action)
  )
}

export function isSimplifySelectionRequestMessage(
  message: unknown,
): message is SimplifySelectionRequestMessage {
  return (
    isMessageOfType(message, SIMPLIFY_SELECTION_REQUEST_MESSAGE) &&
    isOptionalSelectedTextAction((message as { action?: unknown }).action)
  )
}

export function isOpenFollowUpMessage(
  message: unknown,
): message is OpenFollowUpMessage {
  return isMessageOfType(message, OPEN_FOLLOW_UP_MESSAGE)
}

export function isFollowUpSelectionRequestMessage(
  message: unknown,
): message is FollowUpSelectionRequestMessage {
  return (
    isMessageOfType(message, FOLLOW_UP_SELECTION_REQUEST_MESSAGE) &&
    typeof (message as { selectedText?: unknown }).selectedText === "string" &&
    typeof (message as { question?: unknown }).question === "string"
  )
}

export function isSimplifyStatusMessage(
  message: unknown,
): message is SimplifyStatusMessage {
  if (!isMessageOfType(message, SIMPLIFY_STATUS_MESSAGE)) {
    return false
  }

  const status = (message as { status?: unknown }).status
  return status === "loading" || status === "success" || status === "error"
}

function isMessageOfType(
  message: unknown,
  type: string,
): message is { type: string } {
  return (
    message !== null &&
    typeof message === "object" &&
    (message as { type?: unknown }).type === type
  )
}

function isOptionalSelectedTextAction(value: unknown): value is SelectedTextAction | undefined {
  return value === undefined || value === "simplify" || value === "shorten"
}
