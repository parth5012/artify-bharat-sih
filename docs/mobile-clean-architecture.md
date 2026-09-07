# Android Kotlin Clean Architecture Guide

## 1. Architectural Layers

The Artify Bharat Android application is built in Kotlin adhering to Android Clean Architecture and unidirectional data flow (UDF).

```
+-------------------------------------------------------------+
|                     Presentation Layer                      |
|  - Jetpack Compose Screens (Page 1 to Page 7)               |
|  - Material 3 Indian Heritage Theme (Terracotta & Silk)    |
|  - Navigation Host (ArtifyNavGraph)                         |
+------------------------------+------------------------------+
                               |
                               | Calls UseCases
                               v
+-------------------------------------------------------------+
|                        Domain Layer                         |
|  - Domain Models (Artisan, Product, Pricing, Passport)      |
|  - Repository Interfaces (pure Kotlin)                      |
|  - UseCases (operator fun invoke):                          |
|      * RegisterArtisanUseCase                               |
|      * CalculatePricingUseCase                              |
|      * IssuePassportUseCase                                 |
|      * ExportChannelsUseCase                                |
+------------------------------+------------------------------+
                               ^
                               | Implements Interfaces
                               |
+-------------------------------------------------------------+
|                         Data Layer                          |
|  - Remote: Retrofit 2 + OkHttp + DTOs                       |
|  - Local: Room Database (AppDatabase, OfflineTaskDao)       |
|  - Offline Sync Queue: Intermittent connectivity handler    |
|  - Repository Implementations                               |
+-------------------------------------------------------------+
```

## 2. Low-Bandwidth & Offline Sync (Playbook Task 4.1)
Rural handicraft clusters often operate under intermittent 2G/3G connectivity.
- `OfflineTaskEntity` records pending photo uploads, voice notes, and export actions locally in Room.
- When network connectivity is restored, the synchronization engine dequeues pending actions sequentially without data loss or duplicate charges.

## 3. On-Device Vision & Voice Integration
- **CameraX**: Enforces 1:1 square aspect ratio crop viewfinder directly at the hardware sensor level.
- **TFLite**: On-device salient mask estimation enables instant Before vs After preview without waiting for cloud roundtrips.
- **Microphone API**: High-fidelity regional audio stream recording with noise suppression.
