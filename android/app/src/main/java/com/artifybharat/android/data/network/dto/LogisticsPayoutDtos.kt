package com.artifybharat.android.data.network.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class IndiaPostDispatchRequestDto(
    @Json(name = "order_id") val orderId: String,
    @Json(name = "artisan_id") val artisanId: String,
    @Json(name = "pickup_pincode") val pickupPincode: String,
    @Json(name = "delivery_pincode") val deliveryPincode: String,
    @Json(name = "weight_grams") val weightGrams: Double
)

@JsonClass(generateAdapter = true)
data class IndiaPostDispatchResponseDto(
    @Json(name = "tracking_id") val trackingId: String,
    @Json(name = "barcode_data") val barcodeData: String,
    @Json(name = "status") val status: String,
    @Json(name = "estimated_delivery_days") val estimatedDeliveryDays: Int,
    @Json(name = "label_url") val labelUrl: String
)

@JsonClass(generateAdapter = true)
data class DirectPayoutRequestDto(
    @Json(name = "order_id") val orderId: String,
    @Json(name = "artisan_id") val artisanId: String,
    @Json(name = "amount_inr") val amountInr: Double,
    @Json(name = "payout_mode") val payoutMode: String = "upi", // "upi" or "jan_dhan_account"
    @Json(name = "account_number_token") val accountNumberToken: String? = null,
    @Json(name = "vpa_token") val vpaToken: String? = null
)

@JsonClass(generateAdapter = true)
data class DirectPayoutResponseDto(
    @Json(name = "transaction_id") val transactionId: String,
    @Json(name = "status") val status: String,
    @Json(name = "amount_inr") val amountInr: Double,
    @Json(name = "credited_at") val creditedAt: String,
    @Json(name = "utr_reference") val utrReference: String,
    @Json(name = "pii_mask") val piiMask: String
)
