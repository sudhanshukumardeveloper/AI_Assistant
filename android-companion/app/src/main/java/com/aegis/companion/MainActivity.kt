package com.aegis.companion

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val prefs = getSharedPreferences("aegis", Context.MODE_PRIVATE)
    val url = EditText(this).apply { hint = "Runner WebSocket URL (wss://host/android)"; setText(prefs.getString("runner_url","")) }
    val token = EditText(this).apply { hint = "Android runner token"; setText(prefs.getString("runner_token","")); inputType = 0x81 }
    val save = Button(this).apply {
      text = "Save & Open Accessibility Settings"
      setOnClickListener {
        prefs.edit().putString("runner_url", url.text.toString().trim()).putString("runner_token", token.text.toString()).apply()
        startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
      }
    }
    setContentView(LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(32,32,32,32)
      addView(TextView(context).apply { text = "Aegis Companion\nConfigure the trusted runner, save, then enable Aegis Accessibility access." })
      addView(url); addView(token); addView(save)
    })
  }
}