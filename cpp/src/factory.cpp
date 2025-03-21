#include "shared.hpp"
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <BRepBuilderAPI_MakePolygon.hxx>
#include <BRepBuilderAPI_MakeVertex.hxx>
#include <BRepFilletAPI_MakeFillet.hxx>
#include <BRepFilletAPI_MakeChamfer.hxx>
#include <BRepOffsetAPI_MakePipe.hxx>
#include <BRepPrimAPI_MakeBox.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRepPrimAPI_MakePrism.hxx>
#include <BRepPrimAPI_MakeRevol.hxx>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <Geom_BezierCurve.hxx>
#include <gp_Ax2.hxx>
#include <gp_Circ.hxx>
#include <TopoDS_Shape.hxx>
#include <ShapeAnalysis_WireOrder.hxx>
#include <ShapeAnalysis_Edge.hxx>
#include <BRepOffsetAPI_MakeThickSolid.hxx>
#include <BRepAlgoAPI_BooleanOperation.hxx>
#include <BRepAlgoAPI_Common.hxx>
#include <BRepAlgoAPI_Cut.hxx>
#include <BRepAlgoAPI_Fuse.hxx>
#include <BRepPrimAPI_MakeBox.hxx>
#include <BRepPrimAPI_MakeCylinder.hxx>
#include <BRepPrimAPI_MakeCone.hxx>
#include <BRepPrimAPI_MakeSphere.hxx>
#include <BRepBuilderAPI_GTransform.hxx>

using namespace emscripten;

struct ShapeResult
{
    TopoDS_Shape shape;
    bool isOk;
    std::string error;
};

class ShapeFactory
{
public:
    static ShapeResult box(const Pln &ax3, double x, double y, double z)
    {
        TopoDS_Shape box = BRepPrimAPI_MakeBox(Vector3::toPnt(ax3.location), x, y, z).Shape();
        return ShapeResult{box, true, ""};
    }

    static ShapeResult cone(const Vector3 &normal, const Vector3 &center, double radius, double radiusUp, double height)
    {
        gp_Ax2 ax2(Vector3::toPnt(center), Vector3::toDir(normal));
        TopoDS_Shape cone = BRepPrimAPI_MakeCone(ax2, radius, radiusUp, height).Shape();
        return ShapeResult{cone, true, ""};
    }

    static ShapeResult sphere(const Vector3 &center, double radius)
    {
        TopoDS_Shape sphere = BRepPrimAPI_MakeSphere(Vector3::toPnt(center), radius).Shape();
        return ShapeResult{sphere, true, ""};
    }

    static ShapeResult ellipsoid(const Vector3 &normal, const Vector3 &center, const Vector3 &xVec, double xRadius, double yRadius, double zRadius)
    {
        TopoDS_Shape sphere = BRepPrimAPI_MakeSphere(1).Shape();

        gp_GTrsf transform;
        transform.SetValue(1, 1, xRadius);
        transform.SetValue(2, 2, yRadius);
        transform.SetValue(3, 3, zRadius);
        transform.SetTranslationPart(gp_XYZ(center.x, center.y, center.z));

        BRepBuilderAPI_GTransform builder(sphere, transform);
        if (builder.IsDone())
        {
            TopoDS_Shape ellipsoid = builder.Shape();
            return ShapeResult{ellipsoid, true, ""};
        }
        return ShapeResult{TopoDS_Shape(), false, ""};
    }

    static ShapeResult ellipse(const Vector3 &normal, const Vector3 &center, double majorRadius, double minorRadius)
    {
        gp_Ax2 ax2(Vector3::toPnt(center), Vector3::toDir(normal));
        gp_Elips ellipse(ax2, majorRadius, minorRadius);
        BRepBuilderAPI_MakeEdge edge(ellipse);
        if (!edge.IsDone())
        {
            return ShapeResult{TopoDS_Shape(), false, "Failed to create ellipse"};
        }
        return ShapeResult{edge.Edge(), true, ""};
    }

    static ShapeResult pyramid(const Vector3 &point, double x, double y, double z)
    {
        Standard_Real baseSizeX = x;
        Standard_Real baseSizeY = y;
        Standard_Real height = z;
        gp_Pnt baseCenter = gp_Pnt(point.x, point.y, point.z);

        gp_Pnt p1(baseCenter.X(), baseCenter.Y(), baseCenter.Z());
        gp_Pnt p2(baseCenter.X() + baseSizeX, baseCenter.Y(), baseCenter.Z());
        gp_Pnt p3(baseCenter.X() + baseSizeX, baseCenter.Y() + baseSizeY, baseCenter.Z());
        gp_Pnt p4(baseCenter.X(), baseCenter.Y() + baseSizeY, baseCenter.Z());
        gp_Pnt apex(baseCenter.X() + baseSizeX / 2, baseCenter.Y() + baseSizeY / 2, baseCenter.Z() + height);

        TopoDS_Wire baseWire = BRepBuilderAPI_MakeWire(
                                BRepBuilderAPI_MakeEdge(p1, p2),
                                BRepBuilderAPI_MakeEdge(p2, p3),
                                BRepBuilderAPI_MakeEdge(p3, p4),
                                BRepBuilderAPI_MakeEdge(p4, p1))
                                .Wire();
        TopoDS_Face baseFace = BRepBuilderAPI_MakeFace(baseWire).Face();

        TopoDS_Face face1 = BRepBuilderAPI_MakeFace(BRepBuilderAPI_MakeWire(BRepBuilderAPI_MakeEdge(p1, p2), BRepBuilderAPI_MakeEdge(p2, apex), BRepBuilderAPI_MakeEdge(apex, p1))).Face();
        TopoDS_Face face2 = BRepBuilderAPI_MakeFace(BRepBuilderAPI_MakeWire(BRepBuilderAPI_MakeEdge(p2, p3), BRepBuilderAPI_MakeEdge(p3, apex), BRepBuilderAPI_MakeEdge(apex, p2))).Face();
        TopoDS_Face face3 = BRepBuilderAPI_MakeFace(BRepBuilderAPI_MakeWire(BRepBuilderAPI_MakeEdge(p3, p4), BRepBuilderAPI_MakeEdge(p4, apex), BRepBuilderAPI_MakeEdge(apex, p3))).Face();
        TopoDS_Face face4 = BRepBuilderAPI_MakeFace(BRepBuilderAPI_MakeWire(BRepBuilderAPI_MakeEdge(p4, p1), BRepBuilderAPI_MakeEdge(p1, apex), BRepBuilderAPI_MakeEdge(apex, p4))).Face();

        TopoDS_Shell shell;
        BRep_Builder shellBuilder;
        shellBuilder.MakeShell(shell);
        shellBuilder.Add(shell, baseFace);
        shellBuilder.Add(shell, face1);
        shellBuilder.Add(shell, face2);
        shellBuilder.Add(shell, face3);
        shellBuilder.Add(shell, face4);

        TopoDS_Solid pyramid;
        BRep_Builder solidBuilder;
        solidBuilder.MakeSolid(pyramid);
        solidBuilder.Add(pyramid, shell);

        return ShapeResult{pyramid, true, ""};
    }

    static ShapeResult cylinder(const Vector3 &normal, const Vector3 &center, double radius, double height)
    {
        gp_Ax2 ax2(Vector3::toPnt(center), Vector3::toDir(normal));
        BRepPrimAPI_MakeCylinder cylinder(ax2, radius, height);
        return ShapeResult{cylinder.Shape(), true, ""};
    }

    static ShapeResult sweep(const TopoDS_Shape &profile, const TopoDS_Wire &wire)
    {
        BRepOffsetAPI_MakePipe pipe(wire, profile);
        if (!pipe.IsDone())
        {
            return ShapeResult{TopoDS_Shape(), false, "Failed to sweep profile"};
        }
        return ShapeResult{pipe.Shape(), true, ""};
    }

    static ShapeResult revolve(const TopoDS_Shape &profile, const Ax1 &axis, double rad)
    {
        BRepPrimAPI_MakeRevol revol(profile, Ax1::toAx1(axis), rad);
        if (!revol.IsDone())
        {
            return ShapeResult{TopoDS_Shape(), false, "Failed to revolve profile"};
        }
        return ShapeResult{revol.Shape(), true, ""};
    }

    static ShapeResult prism(const TopoDS_Shape &profile, const Vector3 &vec)
    {
        gp_Vec vec3 = Vector3::toVec(vec);
        BRepPrimAPI_MakePrism prism(profile, vec3);
        if (!prism.IsDone())
        {
            return ShapeResult{TopoDS_Shape(), false, "Failed to create prism"};
        }
        return ShapeResult{prism.Shape(), true, ""};
    }

    static ShapeResult polygon(const Vector3Array &points)
    {
        std::vector<Vector3> pts = vecFromJSArray<Vector3>(points);
        BRepBuilderAPI_MakePolygon poly;
        for (auto &p : pts)
        {
            poly.Add(Vector3::toPnt(p));
        }
        if (!poly.IsDone())
        {
            return ShapeResult{TopoDS_Shape(), false, "Failed to create polygon"};
        }
        return ShapeResult{poly.Wire(), true, ""};
    }

    static ShapeResult arc(const Vector3 &normal, const Vector3 &center, const Vector3 &start, double rad)
    {
        gp_Pnt centerPnt = Vector3::toPnt(center);
        gp_Pnt startPnt = Vector3::toPnt(start);
        gp_Dir xvec = gp_Dir(startPnt.XYZ() - centerPnt.XYZ());
        gp_Ax2 ax2(centerPnt, Vector3::toDir(normal), xvec);
        gp_Circ circ(ax2, centerPnt.Distance(startPnt));
        double startAng(0), endAng(rad);
        if (rad < 0) {
            startAng = Math::PI_2 + rad;
            endAng = Math::PI_2;
        }
        BRepBuilderAPI_MakeEdge edge(circ, startAng, endAng);
        if (!edge.IsDone())
        {
            return ShapeResult{TopoDS_Shape(), false, "Failed to create arc"};
        }
        return ShapeResult{edge.Edge(), true, ""};
    }

    static ShapeResult circle(const Vector3 &normal, const Vector3 &center, double radius)
    {
        gp_Ax2 ax2(Vector3::toPnt(center), Vector3::toDir(normal));
        gp_Circ circ(ax2, radius);
        BRepBuilderAPI_MakeEdge edge(circ);
        if (!edge.IsDone())
        {
            return ShapeResult{TopoDS_Shape(), false, "Failed to create circle"};
        }
        return ShapeResult{edge.Edge(), true, ""};
    }

    static ShapeResult rect(const Pln &pln, double width, double height)
    {
        BRepBuilderAPI_MakeFace makeFace(Pln::toPln(pln), 0, width, 0, height);
        if (!makeFace.IsDone())
        {
            return ShapeResult{TopoDS_Shape(), false, "Failed to create rectangle"};
        }
        return ShapeResult{makeFace.Face(), true, ""};
    }

    static ShapeResult bezier(const Vector3Array &points, const NumberArray &weights)
    {
        std::vector<Vector3> pts = vecFromJSArray<Vector3>(points);
        TColgp_Array1OfPnt arrayofPnt(1, pts.size());
        for (int i = 0; i < pts.size(); i++)
        {
            arrayofPnt.SetValue(i + 1, Vector3::toPnt(pts[i]));
        }

        std::vector<double> wts = vecFromJSArray<double>(weights);
        TColStd_Array1OfReal arrayOfWeight(1, wts.size());
        for (int i = 0; i < wts.size(); i++)
        {
            arrayOfWeight.SetValue(i + 1, wts[i]);
        }

        Handle_Geom_Curve curve = wts.size() > 0
                                      ? new Geom_BezierCurve(arrayofPnt, arrayOfWeight)
                                      : new Geom_BezierCurve(arrayofPnt);
        BRepBuilderAPI_MakeEdge edge(curve);
        if (!edge.IsDone())
        {
            return ShapeResult{TopoDS_Shape(), false, "Failed to create bezier"};
        }
        return ShapeResult{edge.Edge(), true, ""};
    }

    static ShapeResult point(const Vector3 &point)
    {
        BRepBuilderAPI_MakeVertex makeVertex(Vector3::toPnt(point));
        if (!makeVertex.IsDone())
        {
            return ShapeResult{TopoDS_Shape(), false, "Failed to create point"};
        }
        return ShapeResult{makeVertex.Vertex(), true, ""};
    }

    static ShapeResult line(const Vector3 &start, const Vector3 &end)
    {
        BRepBuilderAPI_MakeEdge makeEdge(Vector3::toPnt(start), Vector3::toPnt(end));
        if (!makeEdge.IsDone())
        {
            return ShapeResult{TopoDS_Shape(), false, "Failed to create line"};
        }
        return ShapeResult{makeEdge.Edge(), true, ""};
    }

    static void orderEdge(BRepBuilderAPI_MakeWire& wire, const std::vector<TopoDS_Edge> &edges)
    {
        ShapeAnalysis_WireOrder order;
        ShapeAnalysis_Edge analysis;
        for (auto &edge : edges)
        {
            order.Add(
                BRep_Tool::Pnt(analysis.FirstVertex(edge)).XYZ(),
                BRep_Tool::Pnt(analysis.LastVertex(edge)).XYZ());
        }
        order.Perform(true);
        if (order.IsDone())
        {
            for (int i = 0; i < order.NbEdges(); i++)
            {
                int index = order.Ordered(i + 1);
                auto edge = edges[abs(index) - 1];
                if (index < 0)
                {
                    edge.Reverse();
                }
                wire.Add(edge);
            }
        }

    }

    static ShapeResult wire(const EdgeArray &edges)
    {
        std::vector<TopoDS_Edge> edgesVec = vecFromJSArray<TopoDS_Edge>(edges);
        if (edgesVec.size() == 0)
        {
            return ShapeResult{TopoDS_Shape(), false, "No edges provided"};
        }
        BRepBuilderAPI_MakeWire wire;
        if (edgesVec.size() == 1)
        {
            wire.Add(edgesVec[0]);
        } 
        else 
        {
            orderEdge(wire, edgesVec);
        }
        
        if (!wire.IsDone())
        {
            return ShapeResult{TopoDS_Shape(), false, "Failed to create wire"};
        }
        return ShapeResult{wire.Wire(), true, ""};
    }

    static ShapeResult face(const WireArray& wires) {
        std::vector<TopoDS_Wire> wiresVec = vecFromJSArray<TopoDS_Wire>(wires);
        BRepBuilderAPI_MakeFace makeFace(wiresVec[0]);
        for (int i = 1; i < wiresVec.size(); i++) {
            makeFace.Add(wiresVec[i]);
        }
        if (!makeFace.IsDone()) {
            return ShapeResult{TopoDS_Shape(), false, "Failed to create face"};
        }
        return ShapeResult{makeFace.Face(), true, ""};
    }

    static ShapeResult makeThickSolidBySimple(const TopoDS_Shape &shape, double thickness) {
        BRepOffsetAPI_MakeThickSolid makeThickSolid;
        makeThickSolid.MakeThickSolidBySimple(shape, thickness);
        if (!makeThickSolid.IsDone()) {
            return ShapeResult{TopoDS_Shape(), false, "Failed to create thick solid"};
        }
        return ShapeResult{makeThickSolid.Shape(), true, ""};
    }

    static ShapeResult makeThickSolidByJoin(const TopoDS_Shape &shape, const ShapeArray &shapes, double thickness) {
        std::vector<TopoDS_Shape> shapesVec = vecFromJSArray<TopoDS_Shape>(shapes);
        TopTools_ListOfShape shapesList;
        for (auto shape : shapesVec) {
            shapesList.Append(shape);
        }
        BRepOffsetAPI_MakeThickSolid makeThickSolid;
        makeThickSolid.MakeThickSolidByJoin(shape, shapesList, thickness, 1e-6);
        if (!makeThickSolid.IsDone()) {
            return ShapeResult{TopoDS_Shape(), false, "Failed to create thick solid"};
        }
        return ShapeResult{makeThickSolid.Shape(), true, ""};
    }

    static ShapeResult booleanOperate(BRepAlgoAPI_BooleanOperation& boolOperater, const ShapeArray &args, const ShapeArray& tools) {
        std::vector<TopoDS_Shape> argsVec = vecFromJSArray<TopoDS_Shape>(args);
        TopTools_ListOfShape argsList;
        for (auto shape : argsVec) {
            argsList.Append(shape);
        }
        
        std::vector<TopoDS_Shape> toolsVec = vecFromJSArray<TopoDS_Shape>(tools);
        TopTools_ListOfShape toolsList;
        for (auto shape : toolsVec) {
            toolsList.Append(shape);
        }
        
        boolOperater.SetArguments(argsList);
        boolOperater.SetTools(toolsList);
        boolOperater.Build();
        if (!boolOperater.IsDone()) {
            return ShapeResult{TopoDS_Shape(), false, "Failed to build boolean operation"};
        }
        return ShapeResult{boolOperater.Shape(), true, ""};
    }

    static ShapeResult booleanCommon(const ShapeArray &args, const ShapeArray& tools) {
        BRepAlgoAPI_Common api;
        api.SetRunParallel(true);
        return booleanOperate(api, args, tools);
    }

    static ShapeResult booleanCut(const ShapeArray &args, const ShapeArray& tools) {
        BRepAlgoAPI_Cut api;
        api.SetRunParallel(true);
        return booleanOperate(api, args, tools);
    }

    static ShapeResult booleanFuse(const ShapeArray &args, const ShapeArray& tools) {
        BRepAlgoAPI_Fuse api;
        api.SetRunParallel(true);
        return booleanOperate(api, args, tools);
    }

    static ShapeResult combine(const ShapeArray &shapes) {
        std::vector<TopoDS_Shape> shapesVec = vecFromJSArray<TopoDS_Shape>(shapes);
        TopoDS_Compound compound;
        BRep_Builder builder;
        builder.MakeCompound(compound);
        for (auto shape : shapesVec) {
            builder.Add(compound, shape);
        }
        return ShapeResult{compound, true, ""};
    }

    static ShapeResult fillet(const TopoDS_Shape &shape, const EdgeArray& edges, double radius) {
        std::vector<TopoDS_Edge> edgeVec = vecFromJSArray<TopoDS_Edge>(edges);
        BRepFilletAPI_MakeFillet makeFillet(shape);
        for(auto edge : edgeVec) {
            makeFillet.Add(radius, edge);
        }
        makeFillet.Build();
        if (!makeFillet.IsDone()) {
            return ShapeResult{TopoDS_Shape(), false, "Failed to fillet"};
        }

        return ShapeResult{makeFillet.Shape(), true, ""};
    }

    static ShapeResult chamfer(const TopoDS_Shape &shape, const EdgeArray& edges, double distance) {
        std::vector<TopoDS_Edge> edgeVec = vecFromJSArray<TopoDS_Edge>(edges);
        BRepFilletAPI_MakeChamfer makeChamfer(shape);
        for(auto edge : edgeVec) {
            makeChamfer.Add(distance, edge);
        }
        makeChamfer.Build();
        if (!makeChamfer.IsDone()) {
            return ShapeResult{TopoDS_Shape(), false, "Failed to chamfer"};
        }
        return ShapeResult{makeChamfer.Shape(), true, ""};
    }

};

EMSCRIPTEN_BINDINGS(ShapeFactory)
{
    class_<ShapeResult>("ShapeResult")
        .property("shape", &ShapeResult::shape, return_value_policy::reference())
        .property("isOk", &ShapeResult::isOk)
        .property("error", &ShapeResult::error);

    class_<ShapeFactory>("ShapeFactory")
        .class_function("box", &ShapeFactory::box)
        .class_function("cone", &ShapeFactory::cone)
        .class_function("sphere", &ShapeFactory::sphere)
        .class_function("ellipsoid", &ShapeFactory::ellipsoid)
        .class_function("ellipse", &ShapeFactory::ellipse)
        .class_function("cylinder", &ShapeFactory::cylinder)
        .class_function("pyramid", &ShapeFactory::pyramid)
        .class_function("sweep", &ShapeFactory::sweep)
        .class_function("revolve", &ShapeFactory::revolve)
        .class_function("prism", &ShapeFactory::prism)
        .class_function("polygon", &ShapeFactory::polygon)
        .class_function("circle", &ShapeFactory::circle)
        .class_function("arc", &ShapeFactory::arc)
        .class_function("bezier", &ShapeFactory::bezier)
        .class_function("rect", &ShapeFactory::rect)
        .class_function("point", &ShapeFactory::point)
        .class_function("line", &ShapeFactory::line)
        .class_function("wire", &ShapeFactory::wire)
        .class_function("face", &ShapeFactory::face)
        .class_function("makeThickSolidBySimple", &ShapeFactory::makeThickSolidBySimple)
        .class_function("makeThickSolidByJoin", &ShapeFactory::makeThickSolidByJoin)
        .class_function("booleanCommon", &ShapeFactory::booleanCommon)
        .class_function("booleanCut", &ShapeFactory::booleanCut)
        .class_function("booleanFuse", &ShapeFactory::booleanFuse)
        .class_function("combine", &ShapeFactory::combine)
        .class_function("fillet", &ShapeFactory::fillet)
        .class_function("chamfer", &ShapeFactory::chamfer)
    ;

}