import { MeshMinecraftMaterial } from "./MeshMinecraftMaterial";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, BufferAttribute, Mesh } from "three";
import { Minecraft } from "../types";

type UVCorner = [number, number];

function normalizeFaceRotation(rotation?: number) {
    const value = ((rotation ?? 0) % 360 + 360) % 360;
    return value === 90 || value === 180 || value === 270 ? value : 0;
}

function prepFaceUV(
    face?: Minecraft.ItemModelFace,
    material?: MeshMinecraftMaterial
) {
    const uv = face?.uv ?? [0, 0, 0, 0];

    const mcmeta = material?.mcmeta;
    const frameWidth = mcmeta?.animation?.width ?? material?.map?.image?.width;
    const frameHeight =
        mcmeta?.animation != null
            ? mcmeta?.animation?.height ?? material?.map?.image?.height
            : material?.map?.image?.height;

    const frameCount =
        mcmeta != null && frameWidth != null && frameHeight != null
            ? frameHeight / frameWidth
            : 1;

    const u1 = uv[0] / 16;
    const u2 = uv[2] / 16;

    // Model JSON UVs are top-left -> bottom-right.
    // Three texture UVs use bottom-left origin, so we flip the V axis here.
    const vTop = (1 - uv[1] / 16) / frameCount;
    const vBottom = (1 - uv[3] / 16) / frameCount;

    const tl: UVCorner = [u1, vTop];
    const tr: UVCorner = [u2, vTop];
    const bl: UVCorner = [u1, vBottom];
    const br: UVCorner = [u2, vBottom];

    const rotation = normalizeFaceRotation(face?.rotation);

    let corners: [UVCorner, UVCorner, UVCorner, UVCorner];

    switch (rotation) {
        case 90:
            // clockwise
            corners = [bl, tl, br, tr];
            break;
        case 180:
            corners = [br, bl, tr, tl];
            break;
        case 270:
            // clockwise
            corners = [tr, br, tl, bl];
            break;
        default:
            corners = [tl, tr, bl, br];
            break;
    }

    const [c0, c1, c2, c3] = corners;

    // BoxGeometry expects UVs in this per-face vertex order:
    // 0 = top-left, 1 = top-right, 2 = bottom-left, 3 = bottom-right
    return [
        c0[0], c0[1],
        c1[0], c1[1],
        c2[0], c2[1],
        c3[0], c3[1],
    ];
}

export const Cuboid = (props: {
    materialMap: Record<Minecraft.CuboidSide, MeshMinecraftMaterial>;
    element: Minecraft.ItemModelElement;
}) => {
    const meshRef = useRef<Mesh>(null);

    const lenX = props.element.to[0] - props.element.from[0];
    const lenY = props.element.to[1] - props.element.from[1];
    const lenZ = props.element.to[2] - props.element.from[2];

    const geometry = useMemo(() => {
        const geo = new BoxGeometry(lenX, lenY, lenZ);
        geo.computeVertexNormals();
        return geo;
    }, [lenX, lenY, lenZ]);

    const materials = [
        props.materialMap.east,
        props.materialMap.west,
        props.materialMap.up,
        props.materialMap.down,
        props.materialMap.south,
        props.materialMap.north,
    ];

    useEffect(() => {
        const faces = props.element.faces;

        geometry.setAttribute(
            "uv",
            new BufferAttribute(
                new Float32Array([
                    ...prepFaceUV(faces.east, props.materialMap.east),   // material group 0
                    ...prepFaceUV(faces.west, props.materialMap.west),   // material group 1
                    ...prepFaceUV(faces.up, props.materialMap.up),       // material group 2
                    ...prepFaceUV(faces.down, props.materialMap.down),   // material group 3
                    ...prepFaceUV(faces.south, props.materialMap.south), // material group 4
                    ...prepFaceUV(faces.north, props.materialMap.north), // material group 5
                ]),
                2
            )
        );

        geometry.attributes.uv.needsUpdate = true;
    }, [geometry, props.element, props.materialMap]);

    useEffect(() => {
        const angle = props.element.rotation?.angle ?? 0;
        const axis = props.element.rotation?.axis;
        const pivot = props.element.rotation?.origin;

        if (angle !== 0 && pivot) {
            const mesh = meshRef.current!;
            const deltaPivot = [
                pivot[0] - props.element.from[0] - lenX / 2,
                pivot[1] - props.element.from[1] - lenY / 2,
                pivot[2] - props.element.from[2] - lenZ / 2,
            ];

            mesh.translateX(deltaPivot[0]);
            mesh.translateY(deltaPivot[1]);
            mesh.translateZ(deltaPivot[2]);

            if (axis === "x") {
                mesh.rotateX(angle * (Math.PI / 180));
            } else if (axis === "y") {
                mesh.rotateY(angle * (Math.PI / 180));
            } else if (axis === "z") {
                mesh.rotateZ(angle * (Math.PI / 180));
            }

            mesh.translateX(-deltaPivot[0]);
            mesh.translateY(-deltaPivot[1]);
            mesh.translateZ(-deltaPivot[2]);
        }
    }, [lenX, lenY, lenZ, props.element]);

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={materials}
            position={[
                props.element.from[0] + lenX / 2 - 8,
                props.element.from[1] + lenY / 2 - 8,
                props.element.from[2] + lenZ / 2 - 8,
            ]}
        />
    );
};
