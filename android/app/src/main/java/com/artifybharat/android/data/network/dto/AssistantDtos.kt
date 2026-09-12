package com.artifybharat.android.data.network.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class DadiQueryRequestDto(
    @Json(name = "query_text") val queryText: String,
    @Json(name = "dialect") val dialect: String = "bhojpuri",
    @Json(name = "product_category") val productCategory: String = "handloom"
)

@JsonClass(generateAdapter = true)
data class DadiQueryResponseDto(
    @Json(name = "answer_text") val answerText: String,
    @Json(name = "answer_english") val answerEnglish: String,
    @Json(name = "dialect") val dialect: String,
    @Json(name = "audio_response_url") val audioResponseUrl: String? = null,
    @Json(name = "suggested_actions") val suggestedActions: List<String> = emptyList(),
    @Json(name = "dadi_tip") val dadiTip: String
)
