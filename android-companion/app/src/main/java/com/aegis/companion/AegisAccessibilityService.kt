package com.aegis.companion
import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.view.accessibility.AccessibilityEvent
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class AegisAccessibilityService : AccessibilityService() {
  private val client = OkHttpClient.Builder().pingInterval(20, TimeUnit.SECONDS).build()
  private var socket: WebSocket? = null

  override fun onServiceConnected() {
    super.onServiceConnected()
    val runner = System.getenv("AEGIS_RUNNER_WS") ?: return
    val token = System.getenv("AEGIS_RUNNER_TOKEN") ?: return
    socket = client.newWebSocket(Request.Builder().url("$runner/android?token=$token").build(), object: WebSocketListener() {
      override fun onMessage(webSocket: WebSocket, text: String) {
        try {
          val m = JSONObject(text)
          if (m.optString("type") != "action") return
          val id = m.optString("requestId")
          val action = m.optString("action")
          val accepted = executeAction(action)
          webSocket.send(JSONObject().apply { put("type","action_result"); put("requestId",id); put("accepted",accepted) }.toString())
        } catch (e: Exception) {}
      }
    })
  }

  private fun executeAction(action: String): Boolean {
    val lower = action.lowercase()
    if (lower.contains("back")) { performGlobalAction(GLOBAL_ACTION_BACK); return true }
    if (lower.contains("home")) { performGlobalAction(GLOBAL_ACTION_HOME); return true }
    if (lower.contains("recent")) { performGlobalAction(GLOBAL_ACTION_RECENTS); return true }
    val match = Regex("tap\\s+(\\d+)\\s+(\\d+)").find(lower) ?: return false
    val path = Path().apply { moveTo(match.groupValues[1].toFloat(), match.groupValues[2].toFloat()) }
    return dispatchGesture(GestureDescription.Builder().addStroke(GestureDescription.StrokeDescription(path,0,100)).build(), null, null)
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {}
  override fun onInterrupt() {}
}