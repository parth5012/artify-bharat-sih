package `in`.artifybharat.app.data.remote

import `in`.artifybharat.app.data.remote.dto.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

interface ArtifyApiService {

    @POST("api/v1/auth/register")
    suspend fun registerArtisan(@Body request: RegisterRequestDto): Response<AuthResponseDto>

    @Multipart
    @POST("api/v1/studio/enhance")
    suspend fun enhanceStudioImage(
        @Part("artisan_id") artisanId: RequestBody,
        @Part("product_title") productTitle: RequestBody,
        @Part("craft_category") craftCategory: RequestBody,
        @Part image: MultipartBody.Part
    ): Response<Map<String, Any>>

    @Multipart
    @POST("api/v1/catalog/voice")
    suspend fun uploadVoiceCatalog(
        @Part("product_id") productId: RequestBody,
        @Part("dialect") dialect: RequestBody,
        @Part audio: MultipartBody.Part
    ): Response<Map<String, Any>>

    @POST("api/v1/pricing/calculate")
    suspend fun calculatePricing(@Body request: PricingRequestDto): Response<PricingResponseDto>

    @POST("api/v1/passport/issue")
    suspend fun issuePassport(@Body request: PassportIssueRequestDto): Response<PassportResponseDto>

    @POST("api/v1/exports/sync")
    suspend fun exportChannels(@Body request: ExportRequestDto): Response<ExportResponseDto>

    @GET("api/v1/catalog/my-inventory")
    suspend fun getMyInventory(
        @Header("Authorization") token: String? = null,
        @Query("artisan_id") artisanId: String? = null
    ): Response<InventoryListResponseDto>

    @POST("api/v1/assistant/dadi")
    suspend fun askDadi(
        @Body request: DadiQueryRequestDto
    ): Response<DadiQueryResponseDto>
}

