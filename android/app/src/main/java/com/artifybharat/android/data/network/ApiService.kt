package com.artifybharat.android.data.network

import com.artifybharat.android.data.network.dto.AIStudioEnhanceResponseDto
import com.artifybharat.android.data.network.dto.ArtisanIdVerificationRequestDto
import com.artifybharat.android.data.network.dto.ArtisanIdVerificationResponseDto
import com.artifybharat.android.data.network.dto.DadiQueryRequestDto
import com.artifybharat.android.data.network.dto.DadiQueryResponseDto
import com.artifybharat.android.data.network.dto.DirectPayoutRequestDto
import com.artifybharat.android.data.network.dto.DirectPayoutResponseDto
import com.artifybharat.android.data.network.dto.DraftSyncRequestDto
import com.artifybharat.android.data.network.dto.DraftSyncResponseDto
import com.artifybharat.android.data.network.dto.ExportChannelRequestDto
import com.artifybharat.android.data.network.dto.ExportChannelResponseDto
import com.artifybharat.android.data.network.dto.FairWagePricingRequestDto
import com.artifybharat.android.data.network.dto.FairWagePricingResponseDto
import com.artifybharat.android.data.network.dto.HeritagePassportResponseDto
import com.artifybharat.android.data.network.dto.IndiaPostDispatchRequestDto
import com.artifybharat.android.data.network.dto.IndiaPostDispatchResponseDto
import com.artifybharat.android.data.network.dto.InventoryListResponseDto
import com.artifybharat.android.data.network.dto.PassportIssueRequestDto
import com.artifybharat.android.data.network.dto.PeerJuryAssignRequestDto
import com.artifybharat.android.data.network.dto.PeerJuryAssignResponseDto
import com.artifybharat.android.data.network.dto.PeerJuryVoteRequestDto
import com.artifybharat.android.data.network.dto.PeerJuryVoteResponseDto
import com.artifybharat.android.data.network.dto.PinLoginRequestDto
import com.artifybharat.android.data.network.dto.PublicPassportVerificationDto
import com.artifybharat.android.data.network.dto.ReportFakeRequestDto
import com.artifybharat.android.data.network.dto.ReportFakeResponseDto
import com.artifybharat.android.data.network.dto.StudioEnhanceResponseDto
import com.artifybharat.android.data.network.dto.TokenResponseDto
import com.artifybharat.android.data.network.dto.VoiceCatalogResponseDto
import com.artifybharat.android.data.network.dto.VoiceRegisterRequestDto
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {

    // Authentication & Onboarding
    @POST("auth/verify-artisan-id")
    suspend fun verifyArtisanId(
        @Body payload: ArtisanIdVerificationRequestDto
    ): Response<ArtisanIdVerificationResponseDto>

    @POST("auth/login")
    suspend fun loginArtisan(
        @Body payload: PinLoginRequestDto
    ): Response<TokenResponseDto>

    @POST("auth/register")
    suspend fun registerArtisan(
        @Body payload: VoiceRegisterRequestDto
    ): Response<TokenResponseDto>

    // Multilingual Voice Auto-Cataloger
    @Multipart
    @POST("catalog/voice")
    suspend fun autoCatalogVoice(
        @Part("product_id") productId: RequestBody,
        @Part("dialect") dialect: RequestBody,
        @Part audio: MultipartBody.Part
    ): Response<VoiceCatalogResponseDto>

    @POST("catalog/drafts/sync")
    suspend fun syncOfflineDrafts(
        @Body payload: DraftSyncRequestDto
    ): Response<DraftSyncResponseDto>

    @GET("catalog/my-inventory")
    suspend fun getMyInventory(
        @Query("artisan_id") artisanId: String? = null
    ): Response<InventoryListResponseDto>

    // Assistant / Ask Dadi
    @POST("assistant/dadi")
    suspend fun askDadi(
        @Body payload: DadiQueryRequestDto
    ): Response<DadiQueryResponseDto>

    // Authenticity Studio Enhancement
    @Multipart
    @POST("studio/enhance")
    suspend fun enhanceProductPhoto(
        @Part("artisan_id") artisanId: RequestBody,
        @Part("product_title") productTitle: RequestBody,
        @Part("craft_category") craftCategory: RequestBody,
        @Part image: MultipartBody.Part
    ): Response<StudioEnhanceResponseDto>

    @Multipart
    @POST("studio/enhance-studio")
    suspend fun enhanceStudioStateless(
        @Part image: MultipartBody.Part,
        @Part("product_id") productId: RequestBody? = null,
        @Part("remove_bg") removeBg: RequestBody? = null
    ): Response<AIStudioEnhanceResponseDto>

    // Fair-Wage Dynamic Pricing Engine
    @POST("pricing/calculate-price")
    suspend fun calculateFairWagePrice(
        @Body payload: FairWagePricingRequestDto
    ): Response<FairWagePricingResponseDto>

    // Cryptographic Heritage Passport
    @POST("passport/issue")
    suspend fun issueHeritagePassport(
        @Body payload: PassportIssueRequestDto
    ): Response<HeritagePassportResponseDto>

    @GET("passport/verify/{passport_hash}")
    suspend fun verifyHeritagePassport(
        @Path("passport_hash") passportHash: String
    ): Response<PublicPassportVerificationDto>

    @GET("passport/code/{shortcode}")
    suspend fun resolvePassportShortcode(
        @Path("shortcode") shortcode: String
    ): Response<PublicPassportVerificationDto>

    // Zero-Trust Peer Jury Verification
    @POST("verify/jury/assign")
    suspend fun assignPeerJury(
        @Body payload: PeerJuryAssignRequestDto
    ): Response<PeerJuryAssignResponseDto>

    @POST("verify/jury/vote")
    suspend fun submitJuryVote(
        @Body payload: PeerJuryVoteRequestDto
    ): Response<PeerJuryVoteResponseDto>

    @GET("verify/jury/status/{jury_ticket_id}")
    suspend fun getJuryStatus(
        @Path("jury_ticket_id") juryTicketId: String
    ): Response<Map<String, Any?>>

    @POST("verify/report-fake")
    suspend fun reportCounterfeit(
        @Body payload: ReportFakeRequestDto
    ): Response<ReportFakeResponseDto>

    // Government Channel Exports
    @POST("exports/sync")
    suspend fun exportProductToChannels(
        @Body payload: ExportChannelRequestDto
    ): Response<ExportChannelResponseDto>

    // Logistics & Payouts
    @POST("logistics/india-post/dispatch")
    suspend fun dispatchIndiaPost(
        @Body payload: IndiaPostDispatchRequestDto
    ): Response<IndiaPostDispatchResponseDto>

    @POST("payouts/jan-dhan/direct")
    suspend fun executeDirectPayout(
        @Body payload: DirectPayoutRequestDto
    ): Response<DirectPayoutResponseDto>
}
