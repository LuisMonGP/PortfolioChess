"""
Exporta los assets de `LandingChess/3d-chess/chess-assets-organized.blend` a GLB
optimizados para la landing (Three.js).

- Trabaja SIEMPRE sobre copias (objetos, mallas, materiales e imagenes), por lo que
  el .blend original no se modifica.
- Decima la geometria Tripo (0.3M - 2M tris) a presupuestos web.
- Endereza piezas inclinadas (PCA) y coloca el origen en el centro de la base (z = 0).
- Reduce texturas y exporta GLB con Draco + texturas WebP.

Uso (dentro de Blender, p.ej. via MCP):
    exec(open(r"<ruta>/export_web_assets.py").read())
    export_all()            # o export_one("bust")
"""
import bpy
import bmesh
import numpy as np
import mathutils

OUT_DIR = r"C:\Users\MonG\Desktop\portafoliochess\public\models\chess"
TMP_COLL = "__web_export_tmp"

# nombre_salida: (objeto_fuente, tris_objetivo, tamano_textura, enderezar)
ASSETS = {
    "bust":           ("tripo_part_0",     140_000, 2048, False),
    "knight":         ("tripo_part_1",      70_000, 1024, False),
    "king":           ("tripo_part_2",      50_000, 1024, True),
    "queen":          ("tripo_part_0.001",  40_000, 1024, False),
    "bishop":         ("tripo_part_1.001",  35_000, 1024, False),
    "rook":           ("tripo_part_2.001",  35_000, 1024, False),
    "pawn":           ("tripo_part_3",      25_000, 1024, False),
    "board":          ("tripo_node_6e755274-d3a4-4b80-89d8-5fd4fafa3721", 60_000, 2048, False),
}


def _tmp_collection():
    coll = bpy.data.collections.get(TMP_COLL)
    if coll is None:
        coll = bpy.data.collections.new(TMP_COLL)
        bpy.context.scene.collection.children.link(coll)
    return coll


def _tri_count(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)


def _copy_material(mat, tex_size, suffix):
    new = mat.copy()
    new.name = f"{mat.name}__web_{suffix}"
    for n in new.node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image:
            img = n.image.copy()
            img.name = f"{n.image.name}__web_{suffix}"
            w, h = img.size[:]
            if max(w, h) > tex_size:
                img.scale(tex_size, tex_size)
            n.image = img
    return new


def _straighten_pca(obj):
    me = obj.data
    co = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    center = co.mean(axis=0)
    c = co - center
    w, v = np.linalg.eigh(np.cov(c.T))
    axis = v[:, np.argmax(w)]
    proj = c @ axis
    lo, hi = np.quantile(proj, [0.08, 0.92])
    radial = lambda mask: np.linalg.norm(c[mask] - np.outer(proj[mask], axis), axis=1).mean()
    # la base es el extremo mas ancho -> el eje debe apuntar de la base hacia la corona
    if radial(proj <= lo) < radial(proj >= hi):
        axis = -axis
    q = mathutils.Vector(axis).rotation_difference(mathutils.Vector((0, 0, 1)))
    me.transform(mathutils.Matrix.Translation(center) @ q.to_matrix().to_4x4() @ mathutils.Matrix.Translation(-mathutils.Vector(center)))
    me.update()


def _origin_to_base(obj):
    me = obj.data
    co = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    zmin = co[:, 2].min()
    # centro XY de la franja inferior (base) para que la pieza gire sobre su eje
    base = co[co[:, 2] < zmin + 0.04 * (co[:, 2].max() - zmin)]
    cx, cy = (base[:, 0].min() + base[:, 0].max()) / 2, (base[:, 1].min() + base[:, 1].max()) / 2
    me.transform(mathutils.Matrix.Translation((-cx, -cy, -zmin)))
    me.update()
    obj.location = (0, 0, 0)


def export_one(key):
    src_name, target_tris, tex_size, straighten = ASSETS[key]
    src = bpy.data.objects[src_name]
    coll = _tmp_collection()

    obj = src.copy()
    obj.data = src.data.copy()
    obj.name = f"{key}"
    obj.data.name = f"{key}_mesh"
    obj.parent = None
    obj.matrix_world = src.matrix_world.copy()
    coll.objects.link(obj)

    # hornear transformaciones en la malla
    obj.data.transform(obj.matrix_world)
    obj.matrix_world = mathutils.Matrix.Identity(4)

    # decimacion
    tris = _tri_count(obj.data)
    if tris > target_tris:
        mod = obj.modifiers.new("decimate", "DECIMATE")
        mod.decimate_type = "COLLAPSE"
        mod.ratio = target_tris / tris
        mod.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = obj
        with bpy.context.temp_override(object=obj, active_object=obj):
            bpy.ops.object.modifier_apply(modifier=mod.name)

    if straighten:
        _straighten_pca(obj)
    if key != "board":
        _origin_to_base(obj)

    # sombreado suave para geometria organica decimada
    for p in obj.data.polygons:
        p.use_smooth = True

    obj.data.materials.clear()
    for m in src.data.materials:
        obj.data.materials.append(_copy_material(m, tex_size, key))

    # exportar solo esta copia
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    path = f"{OUT_DIR}\\{key}.glb"
    kwargs = dict(
        filepath=path, export_format="GLB", use_selection=True,
        export_apply=True, export_yup=True, export_animations=False,
        export_cameras=False, export_lights=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_image_format="WEBP",
    )
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_image_quality=82)
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)

    final_tris = _tri_count(obj.data)
    dims = tuple(round(d, 4) for d in obj.dimensions)
    _cleanup(obj)
    return f"{key}: {tris} -> {final_tris} tris | dims {dims} | {path}"


def _cleanup(obj):
    mats = [m for m in obj.data.materials if m]
    imgs = [n.image for m in mats for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image]
    me = obj.data
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.meshes.remove(me)
    for m in mats:
        bpy.data.materials.remove(m)
    for i in imgs:
        bpy.data.images.remove(i)
    coll = bpy.data.collections.get(TMP_COLL)
    if coll and not coll.objects:
        bpy.data.collections.remove(coll)


def export_all():
    return [export_one(k) for k in ASSETS]
