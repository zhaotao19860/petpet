// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PetPet",
    platforms: [.iOS(.v16)],
    products: [
        .library(name: "PetPet", targets: ["PetPet"])
    ],
    targets: [
        .target(
            name: "PetPet",
            path: "Sources/PetPet"
        )
    ]
)
