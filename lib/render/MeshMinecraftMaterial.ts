import { Minecraft } from "../types";
import { MeshBasicMaterial, MeshBasicMaterialParameters } from "three";

export class MeshMinecraftMaterial extends MeshBasicMaterial {
    public readonly mcmeta?: Minecraft.Mcmeta | null;

    constructor(
        mcmeta?: Minecraft.Mcmeta | null,
        parameters?: MeshBasicMaterialParameters
    ) {
        super({
            ...parameters,
            transparent: true,
            alphaTest: 1,
        });

        this.mcmeta = mcmeta;
    }
}