import { Cuboid } from "./Cuboid";
import { OrthographicCamera } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { RenderContext, useItemModelGlContext } from "../context/ItemModelGl.ctx";
import { MeshMinecraftMaterial } from "./MeshMinecraftMaterial";
import { TextureLoader } from "./TextureLoader";
import { ElementRef, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NoToneMapping, SRGBColorSpace } from "three";

import { Minecraft } from "../types";

const IDENTITY_TRANSFORM: Minecraft.ItemModelTransformation = {
    rotation: [0, 0, 0],
    translation: [0, 0, 0],
    scale: [1, 1, 1],
};

export const ItemModelRender = () => {
    const canvasRef = useRef<ElementRef<"canvas">>(null);

    const imgl = useItemModelGlContext();
    const currentCtx = !imgl.renderingItem
        ? undefined
        : imgl.renderContextMap.current.get(imgl.renderingItem);

    return (
        <>
            {imgl.renderingItem &&
                createPortal(
                    <div
                        id="iskallia-item-model-renderer"
                        style={{
                            width: currentCtx?.imageSize,
                            height: currentCtx?.imageSize,
                            position: "fixed",
                            top: "-100%",
                            left: "-100%",
                        }}
                    >
                        <Canvas
                            ref={canvasRef}
                            gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
                            onCreated={({ gl }) => {
                                gl.outputColorSpace = SRGBColorSpace;
                                gl.toneMapping = NoToneMapping;
                                gl.toneMappingExposure = 1;
                                gl.setClearColor(0x000000, 0);
                            }}
                        >
                            {currentCtx && <ItemModel key={currentCtx.itemId} ctx={currentCtx} />}
                        </Canvas>
                    </div>,
                    document.body
                )}
        </>
    );
};

export function ItemModel(props: { ctx: RenderContext }) {
    const imgl = useItemModelGlContext();
    const gl = useThree((state) => state.gl);

    const modelTransformName = imgl.itemModelTransform ?? "gui";
    const modelTransformation =
        props.ctx.itemModel.display?.[modelTransformName] ?? IDENTITY_TRANSFORM;

    const materialLookup = useRef(new Map<string, MeshMinecraftMaterial>());
    const zoomFactor = imgl.zoomFactor ?? 1;
    const zoom = zoomFactor * ((25 / 480) * (props.ctx.imageSize ?? 480));

    const [materialMaps, setMaterialMaps] =
        useState<Record<Minecraft.CuboidSide, MeshMinecraftMaterial>[]>();

    useEffect(() => {
        const loadFaceMaterial = async (face: Minecraft.ItemModelFace) => {
            const textureRef = face.texture.substring(1);
            const textureLocation = props.ctx.itemModel.textures[textureRef];
            if (!textureLocation) return null;

            const textureUrl = imgl.resolveTextureUrl(textureLocation);

            if (materialLookup.current.has(textureUrl)) {
                return materialLookup.current.get(textureUrl)!;
            }

            const texture = await TextureLoader.getOrLoadItemTexture(textureUrl);

            const material = new MeshMinecraftMaterial(
                imgl.mcmetaCache.current.get(textureLocation),
                {
                    map: texture,
                    transparent: true,
                    alphaTest: 1,
                }
            );

            materialLookup.current.set(textureUrl, material);
            return material;
        };

        const loadMaterialMap = async (element: Minecraft.ItemModelElement) => {
            const entries = await Promise.all(
                Object.entries(element.faces).map(
                    async ([side, face]) => [side, await loadFaceMaterial(face)] as const
                )
            );

            return Object.fromEntries(entries) as Record<
                Minecraft.CuboidSide,
                MeshMinecraftMaterial
            >;
        };

        const capture = () => {
            const image = gl.domElement.toDataURL("image/png");
            imgl.finishRendering(props.ctx.itemId, image);
        };

        const loadMaterialMaps = async () => {
            const loadedMaps = await Promise.all(
                props.ctx.itemModel.elements.map((element) => loadMaterialMap(element))
            );

            setMaterialMaps(loadedMaps);

            const wait = imgl.individualRenderWait ?? 0;

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (wait > 0) {
                        setTimeout(capture, wait);
                    } else {
                        capture();
                    }
                });
            });
        };

        loadMaterialMaps();
    }, [gl, imgl, props.ctx]);

    return (
        <>
            <OrthographicCamera makeDefault manual zoom={zoom} position={[0, 0, 100]} />

            <group
                position={modelTransformation.translation}
                rotation={
                    modelTransformation.rotation?.map(
                        (deg) => (deg * Math.PI) / 180
                    ) as Minecraft.Vec3
                }
                scale={modelTransformation.scale}
            >
                {materialMaps != null &&
                    props.ctx.itemModel.elements.map((element, i) => (
                        <Cuboid key={i} element={element} materialMap={materialMaps[i]} />
                    ))}
            </group>
        </>
    );
}
