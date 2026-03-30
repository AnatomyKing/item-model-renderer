import {
    NearestFilter,
    SRGBColorSpace,
    Texture,
    TextureLoader as _TextureLoader,
} from "three";

export namespace TextureLoader {
    const loader = new _TextureLoader();
    const textures = new Map<string, Texture>();

    function configureTexture(texture: Texture) {
        texture.magFilter = NearestFilter;
        texture.minFilter = NearestFilter;
        texture.generateMipmaps = false;
        texture.colorSpace = SRGBColorSpace;
        texture.needsUpdate = true;
    }

    export async function getOrLoadItemTexture(url: string): Promise<Texture> {
        return new Promise((resolve, reject) => {
            if (textures.has(url)) {
                resolve(textures.get(url)!);
                return;
            }

            const texture = loader.load(
                url,
                (loadedTexture) => {
                    configureTexture(loadedTexture);
                    textures.set(url, loadedTexture);
                    resolve(loadedTexture);
                },
                undefined,
                (error) => {
                    reject(new Error(`Failed to load texture from ${url}`, { cause: error }));
                }
            );

            configureTexture(texture);
        });
    }
}