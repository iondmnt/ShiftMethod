/****************************************************************************
 ** @license
 ***************************************************************************/
 import {
  Arrow,
  ArrowType,
  BezierEdgeStyle,
  Color,
  ConnectedComponents,
  DefaultLabelStyle,
  EdgePathLabelModel,
  EdgeSides,
  EdgeStyleDecorationInstaller,
  ExteriorLabelModel,
  ExteriorLabelModelPosition,
  Fill,
  GeneralPath,
  GeneralPathNodeStyle,
  Geom,
  GraphComponent,
  GraphCopier,
  GraphEditorInputMode,
  GraphViewerInputMode,
  NodeStyleDecorationInstaller,
  GraphItemTypes,
  GraphMLSupport,
  GraphSnapContext,
  GridConstraintProvider,
  GridInfo,
  GridSnapTypes,
  GridStyle,
  GridVisualCreator,
  HashMap,
  ICommand,
  INode,
  Insets,
  InteriorLabelModel,
  Key,
  LabelSnapContext,
  ModifierKeys,
  MutableRectangle,
  PlanarEmbedding,
  Point,
  PolylineEdgeStyle,
  Rect,
  ShapeNodeStyle,
  ShapeNodeShape,
  StyleDecorationZoomPolicy,
  Size,
  StorageLocation,
  Stroke,
  VoidEdgeStyle,
  VoidNodeStyle,
  YGraphAdapter,
  YList,
  YPoint,
  YVector,
  IEdge
} from 'yfiles'
 
import FileSaveSupport from '../utils/FileSaveSupport.js'
import {addClass, bindAction, bindCommand, removeClass, showApp} from '../resources/demo-app.js'
import {fetchLicense} from '../resources/fetch-license.js'
import ClientSideImageExport from './ClientSideImageExport.js'
import {  detectInternetExplorerVersion} from '../utils/Workarounds.js'
import HTMLPopupSupport from './HTMLPopupSupport.js'

import { License } from 'yfiles';

License.value = {
  "comment": "academic",
  "company": "National Technical University of Athens (NTUA) - Department of Mathematics",
  "contact": "Antonios Symvonis",
  "date": "01/03/2022",
  "distribution": false,
  "domains": [
    "*"
  ],
  "email": "symvonis@math.ntua.gr",
  "fileSystemAllowed": true,
  "licensefileversion": "1.1",
  "localhost": true,
  "oobAllowed": true,
  "package": "complete",
  "product": "yFiles for HTML",
  "projectname": "Algorithmic Applications Research Group (AARG) Prof. Antonios Symvonis",
  "subscription": "12/31/2022",
  "type": "project",
  "version": "2.4",
  "watermark": "yFiles HTML Development License",
  "key": "3bec2c37304e60ff40f5707d4a199ebfe8af1778"
}
 
/** @type {GraphComponent} */
var graphComponent = null
/** @type {GraphComponent} */
var savedGraph = null
 
const snapshots = [];
 
const ieVersion = detectInternetExplorerVersion()
const clientSideImageExport = new ClientSideImageExport()
var grid = null;
 
/**
 * @returns {!Promise}
 */
 
 
async function run() {
  License.value = await fetchLicense()
  // Initialize the GraphComponent and place it in the div with CSS selector #graphComponent
 
  graphComponent = new GraphComponent('#graphComponent')
  savedGraph = new GraphComponent('#savedGraph')
 
  
  initializeHighlightStyles();
 
  // Configure interaction
  configureInteraction()
  
  // Configures default label model parameters for newly created graph elements
  setDefaultLabelParameters()
 
  // Configures default styles for newly created graph elements
  setDefaultStyles()
  
  // Manages the viewport
  updateViewport()
 
  // bind the demo buttons to their commands
  registerCommands()
 
//initialize grid and snapping
  initializeSnapping()
   initializeGrid()
 
  // Initialize the demo application's CSS and Javascript for the description
  showApp(graphComponent)

  
}

function getDiv(id) {
  return document.getElementById(id)
}

function initializePopups(graphComponent) {
  // Creates a label model parameter that is used to position the node pop-up
  const nodeLabelModel = new ExteriorLabelModel({ insets: 10 })
  

  // Creates the pop-up for the node pop-up template
  const nodePopup = new HTMLPopupSupport(
    graphComponent,
    getDiv('nodePopupContent'),
    nodeLabelModel.createParameter(ExteriorLabelModelPosition.NORTH)
  )

  //Retrieves the GraphComponent's input mode
  const inputMode = graphComponent.inputMode

  // The pop-up is shown for the currentItem thus nodes and edges should be focusable
  inputMode.focusableItems = GraphItemTypes.NODE | GraphItemTypes.EDGE
  inputMode.movableItems = GraphItemTypes.NONE

  // Register a listener that shows the pop-up for the currentItem
  graphComponent.addCurrentItemChangedListener((sender, args) => {
    const item = graphComponent.currentItem
    if (item instanceof INode && item!==backgroundNode) {
      // update data in node pop-up
      updateNodePopupContent(nodePopup, item)
      // open node pop-up
      nodePopup.currentItem = item
        } else {
      nodePopup.currentItem = null
    }
  })

  // On clicks on empty space, set currentItem to `null` to hide the pop-ups
  inputMode.addCanvasClickedListener((sender, args) => {
    graphComponent.currentItem = null
  })

  // On press of the ESCAPE key, set currentItem to `null` to hide the pop-ups
  inputMode.keyboardInputMode.addKeyBinding(
    Key.ESCAPE,
    ModifierKeys.NONE,
    (command, parameter, source) => {
      source.currentItem = null
      return true
    }
  )
}

/**
 * Updates the node pop-up content with the elements from the node's tag.
 * @param {!HTMLPopupSupport} nodePopup
 * @param {!INode} node
 */
function updateNodePopupContent(nodePopup, node) {
  
  if(node!==backgroundNode){
  // get all divs in the pop-up
  const divs = nodePopup.div.getElementsByTagName('div')
  var length = divs.length;
  for (let i = 0; i < length; i++) {
    const div = divs.item(0)
    const div2 = divs.item(1);
    const x = (node.layout.center.x-startPoint.x)/30;
    const y = -(node.layout.center.y-startPoint.y)/30;
div.textContent = '(x,y):'
    div2.textContent = '(' + x + ',' + y + ')'
    
  }
}
}
 
var orderedNodes = new Array();
 
//The color palette for all the color nodes
const colors = [];
colors.push("#d2b7eb","#851255","#8f95ff","#ae6aee","#ff61be","#00bbef","#612c93","#ffb9e2","#2986cc","#290a46","#ff00f5","#4b5ead","#c90076","#ff007e","#1800ff")
var colCount = 0;

//Selects a color from the color palette
function chooseColor(){
  if(colCount==colors.length){
    colCount = 0;
  }
  var color = colors[colCount];
  colCount++;
  return color;
  
}
 
//Giving the edge and the starting node, we move to the target node and find the next ccw edge of this node
function getNextCCWEdge(edge, node) {
  var graph = graphComponent.graph;
  var tNode = null;
  if (node == edge.targetNode) {
    var tNode = edge.sourceNode;
  } else {
    var tNode = edge.targetNode;
  }
  var tNodeEdges = graph.edgesAt(tNode);
  var angle = 2 * Math.PI;
  var retEdge = null;
  var length = tNodeEdges.size;
  for (var i = 0; i < length;  i++) {
    var thisEdge = tNodeEdges.get(i);
    if (getAngle(tNode, edge, thisEdge) < angle) {
      angle = getAngle(tNode, edge, thisEdge);
      retEdge = thisEdge;
    }
  }
  return retEdge;
}
 
function getNextCWEdge(edge, node) {
  var graph = graphComponent.graph;
  var tNode = null;
  if (node == edge.targetNode) {
    var tNode = edge.sourceNode;
  } else {
    var tNode = edge.targetNode;
  }
  var tNodeEdges = graph.edgesAt(tNode);
  var angle = -2 * Math.PI;
  var retEdge = null;
  var length = tNodeEdges.size;
  for (var i = 0; i < length;  i++) {
    var thisEdge = tNodeEdges.get(i);
    if (getAngle(tNode, edge, thisEdge) > angle) {
      angle = getAngle(tNode, edge, thisEdge);
      retEdge = thisEdge;
    }
  }
  return retEdge;
}
 
function getAngle(node, edge1, edge2) {
  var vector1 = null
  var vector2 = null
 
  if (edge1.sourceNode == node) {
    var vector1 = new YVector(edge1.targetNode.layout.center.x, edge1.targetNode.layout.center.y, edge1.sourceNode.layout.center.x, edge1.sourceNode.layout.center.y)
  } else if (edge1.targetNode == node) {
    var vector1 = new YVector(edge1.sourceNode.layout.center.x, edge1.sourceNode.layout.center.y, edge1.targetNode.layout.center.x, edge1.targetNode.layout.center.y)
  }
 
  if (edge2.sourceNode == node) {
    var vector2 = new YVector(edge2.targetNode.layout.center.x, edge2.targetNode.layout.center.y, edge2.sourceNode.layout.center.x, edge2.sourceNode.layout.center.y)
  } else if (edge2.targetNode == node) {
    var vector2 = new YVector(edge2.sourceNode.layout.center.x, edge2.sourceNode.layout.center.y, edge2.targetNode.layout.center.x, edge2.targetNode.layout.center.y)
  }
 
  const angle = YVector.angle(vector2, vector1);
  return angle;
}
 

function findFaces2() {
  var graph = graphComponent.graph;
  var nodes2 = graph.nodes;
  var nodes = nodes2.filter(item=>item.labels.size>0);
  var facesNodes = [];
  var facesEdges = [];
  var traversedEdges = new Array(graph.edges.size);
  traversedEdges.fill(0);
  var edges = graph.edges;
  var length = nodes.size;
 
  for (var j = 0; j < length; j++) {
    var node1 = nodes.at(j);
    var nEdges = graph.edgesAt(node1);
 
    var length2 = nEdges.size;
    for (var i = 0; i < length2; i++) {
      const edge = nEdges.get(i);
      var index = edges.findIndex(item => item == edge);
      var nodee = node1;
      var error = false;
 
      if (traversedEdges[index] < 2) {
 
        var face = [];
        var face2 = [];
        face.push(edge);
        face2.push(edge.targetNode, edge.sourceNode);
        var edge1 = edge;
 
        
        while (true) {
          var edge2 = getNextCCWEdge(edge1, nodee);
          if (edge2 == edge) {
            break; 
          }
          if (edge2 == null) {
           alert("Your graph is not internally triangulated!")
            //throw new Error('Your graph is not internally triangulated!');
 
          }
 
          face.push(edge2);
          const targetNode = edge2.targetNode;
          const sourceNode = edge2.sourceNode;
          if (!face2.includes(targetNode)) {
            face2.push(targetNode);
          }
          if (!face2.includes(sourceNode)) {
            face2.push(sourceNode);
          }
          if (nodee == edge1.sourceNode) {
            nodee = edge1.targetNode
          } else if (nodee = edge1.targetNode) {
            nodee = edge1.sourceNode;
          }
 
          var edge1 = edge2;
          if(face.length>nodes.size+1){
            error = true; 
            break;
          }
 
        }
 
        //Checkaroume an to face uparxei idi

        if(error==false){
        var boolean = true;
        //Elegxoume ena ena ta idi uparxonta faces
        for(var l=0; l<facesEdges.length; l++){
          var c=0;
          var tFace = facesEdges[l];
          //An ena face periexei ena stoixeio tou trexontos tote c++
          for (var m=0; m<face.length; m++){
            if(tFace.includes(face[m])){
              c++;
            }
          }
          //An sto telos to c isoutai me ton arithmo twn stoixeiwn tou trexontos face kai tou face upo exetasi, tote einai ta duo faces tautizontai, ara den ksanavazoume to face sto array
          if(c==face.length && tFace.length==face.length){
            var boolean = false;
          }
        }

        if(boolean==true){
        for(var n=0; n<face.length; n++){
          var e = face[n];
          var ind = edges.findIndex(item => item == e);
          traversedEdges[ind]++;
        }
        facesEdges.push(face);
        facesNodes.push(face2);
        
          }

 
      }
    }
 
    }
 
  }
 
  return facesEdges;
}

function findFaces3(fe) {
  const facesNodes = [];
 
  var length =fe.length;
  for (var i = 0; i < length; i++) {
    var face = fe[i];
    var face2 = [];
    var length2 = face.length;
    for (var j = 0; j < length2; j++) {
      var edgie = face[j];
      if (!face2.includes(edgie.targetNode)) {
        face2.push(edgie.targetNode);
      }
      if (!face2.includes(edgie.sourceNode)) {
        face2.push(edgie.sourceNode);
      }
    }
    facesNodes.push(face2);
  }
 
 
  return facesNodes;
 
}
 
function configureInteraction() {
  // Creates a new GraphEditorInputMode instance and registers it as the main
  // input mode for the graphComponent
  var mode1 = new GraphEditorInputMode({
    allowReparentNodes: false,
    allowAdjustGroupNodeSize: false,
    allowGroupingOperations: false,
    allowCreateBend: false,
    showHandleItems: GraphItemTypes.NONE,
    toolTipItems: GraphItemTypes.NODE,
    selectableItems: GraphItemTypes.NODE,
    marqueeSelectableItems: GraphItemTypes.NODE,
    movableItems:GraphItemTypes.NODE | GraphItemTypes.EDGE
  })
  mode1.createEdgeInputMode.allowCreateBend = false;


  mode1.mouseHoverInputMode.toolTipLocationOffset = new Point(10, 10)
  mode1.addQueryItemToolTipListener((sender, args) => {
    if (args.item instanceof INode && !args.handled) {
      const nodeName = 1
      if (nodeName) {
        args.toolTip = nodeName
        args.handled = true
      }
    }
  })

 
  var mode2 = new GraphEditorInputMode({
    allowReparentNodes: false,
    allowAdjustGroupNodeSize: false,
    allowGroupingOperations: false,
    allowCreateBend: false
  })
  mode2.createEdgeInputMode.allowCreateBend = false;
 
  graphComponent.inputMode = mode1;
  savedGraph.inputMode = mode2;
}
 
 
function initializeSnapping() {
  const geim = graphComponent.inputMode
  const sGeim = savedGraph.inputMode
 
  const graphSnapContext = new GraphSnapContext({
    enabled: true,
    // disable some default snapping behavior such that the graph items only snap to the grid and nowhere else
    snapBendAdjacentSegments: false,
    snapBendsToSnapLines: false,
    snapNodesToSnapLines: false,
    snapOrthogonalMovement: false,
    snapPortAdjacentSegments: false,
    snapSegmentsToSnapLines: false
  })
  const labelSnapContext = new LabelSnapContext()
  geim.snapContext = graphSnapContext
  geim.labelSnapContext = labelSnapContext
  sGeim.snapContext = graphSnapContext
  sGeim.labelSnapContext = labelSnapContext
}
 
function initializeGrid() {
  const gridSnapTypes = new HashMap()
  gridSnapTypes.set('Points', GridSnapTypes.GRID_POINTS)
 
  const gridStyles = new HashMap()
  gridStyles.set('Dots', GridStyle.DOTS)
  gridStyles.set('Lines', GridStyle.LINES)
  
  // Initializes GridInfo which holds the basic information about the grid
  // Sets horizontal and vertical space between grid lines
  const gridInfo = new GridInfo()
  gridInfo.horizontalSpacing = 30
  gridInfo.verticalSpacing = 30
 
  // Creates grid visualization and adds it to graphComponent
  grid = new GridVisualCreator(gridInfo)
  grid.gridStyle = GridStyle.LINES
  grid.stroke = new Stroke(Fill.GRAY, 0.2)
  graphComponent.backgroundGroup.addChild(grid)
  savedGraph.backgroundGroup.addChild(grid)
  // Sets constraint provider to make nodes and bends snap to grid
  const graphSnapContext = graphComponent.inputMode.snapContext
  graphSnapContext.nodeGridConstraintProvider = new GridConstraintProvider(gridInfo)
  graphSnapContext.bendGridConstraintProvider = new GridConstraintProvider(gridInfo)
 
  const sGraphSnapContext = savedGraph.inputMode.snapContext
  sGraphSnapContext.nodeGridConstraintProvider = new GridConstraintProvider(gridInfo)
  sGraphSnapContext.bendGridConstraintProvider = new GridConstraintProvider(gridInfo)
 
  updateSnapType(GridSnapTypes.GRID_POINTS)
 
}
 
function updateSnapType(gridSnapType) {
  const graphSnapContext = graphComponent.inputMode.snapContext
  graphSnapContext.gridSnapType = gridSnapType
 
  const sGraphSnapContext = savedGraph.inputMode.snapContext
  sGraphSnapContext.gridSnapType = gridSnapType
 
}
 
 
/**
 * Set up default label model parameters for graph elements.
 * Label model parameters control the actual label placement as well as the available
 * placement candidates when moving the label interactively.
 */
function setDefaultLabelParameters() {
  const graph = graphComponent.graph
  const sGraph = savedGraph.graph
 
  // For node labels, the default is a label position at the node center
  // var's keep the default.  Here is how to set it manually
  graph.nodeDefaults.labels.layoutParameter = InteriorLabelModel.CENTER
  sGraph.nodeDefaults.labels.layoutParameter = InteriorLabelModel.CENTER
 
  // For edge labels, the default is a label that is rotated to match the associated edge segment
  // We'll start by creating a model that is similar to the default:
  const edgeLabelModel = new EdgePathLabelModel({
    autoRotation: true,
    distance: 10,
    sideOfEdge: EdgeSides.LEFT_OF_EDGE | EdgeSides.RIGHT_OF_EDGE
  })
  // Finally, we can set this label model as the default for edge labels
  graph.edgeDefaults.labels.layoutParameter = edgeLabelModel.createDefaultParameter()
  sGraph.edgeDefaults.labels.layoutParameter = edgeLabelModel.createDefaultParameter()
}
 
 
/**
 * Set up default styles for graph elements.
 * Default styles apply only to elements created after the default style has been set,
 * so typically, you'd set these as early as possible in your application.
 */
function setDefaultStyles() {
  const graph = graphComponent.graph
  const sGraph = savedGraph.graph
 
  graph.undoEngineEnabled = true
 
  sGraph.undoEngineEnabled = true

  // Sets this style as the default for all nodes that don't have another
  // style assigned explicitly
  graph.nodeDefaults.style = new ShapeNodeStyle({
    shape: 'pill',
    fill: '#6a6a6a',
    stroke: '1.5px #6a6a6a'
  })
 
  sGraph.nodeDefaults.style = new ShapeNodeStyle({
    shape: 'pill',
    fill: '#6a6a6a',
    stroke: '1.5px #6a6a6a'
  })
 
  // Sets the default size for nodes explicitly to 20x20
  graph.nodeDefaults.size = new Size(20, 20)
  sGraph.nodeDefaults.size = new Size(20, 20)
 
  // Creates a PolylineEdgeStyle which will be used as default for all edges
  // that don't have another style assigned explicitly
  graph.edgeDefaults.style = new PolylineEdgeStyle({
    stroke: '1.5px #151515'
  })
  sGraph.edgeDefaults.style = new PolylineEdgeStyle({
    stroke: '1.5px #151515'
  })
 
  // Creates a label style with the label font set to Tahoma and a black text color
  const defaultLabelStyle = new DefaultLabelStyle({
    font: '12px Tahoma',
    textFill: 'black'
  })
 
  // Sets the defined style as the default for both edge and node labels
  graph.edgeDefaults.labels.style = defaultLabelStyle
  graph.nodeDefaults.labels.style = defaultLabelStyle
 
  sGraph.edgeDefaults.labels.style = defaultLabelStyle
  sGraph.nodeDefaults.labels.style = defaultLabelStyle
 
}
 
 
function updateViewport() {
  
  graphComponent.fitGraphBounds()
  savedGraph.fitGraphBounds()
}
 
//Adds labels to nodes, based on their position in nodes list.
function addLabels() {
  const graph = graphComponent.graph;
  const nodes = graph.nodes;
 
  var length = nodes.size;
  for (var i = 0; i <length;  i++) {
    var num = i.toString();
    graph.addLabel(nodes.at(i), num)
  }
 
}
 
//Copies the selected graph from the main component grid to the little top left grid
function copyGraph() {
  const graphCopier = new GraphCopier()
  savedGraph.graph.clear()
  graphCopier.copy(graphComponent.graph, savedGraph.graph);
  savedGraph.fitGraphBounds()
  return true
}

//Finds the outerface of the current graph
function findOuterface(){
  const graph = graphComponent.graph;
  var nodes2 = graph.nodes;
  var nodes = nodes2.filter(item=>item.labels.size>0);
  const faces = findFaces2();
  const faceAsNodes = findFaces3(faces);

  //Calculating the convex hull of the centers of all nodes
  var nodeCenters = new Array(nodes.size);
  var length = nodes.size;
  for (var i = 0; i < length; i++) {
    var point1 = nodes.at(i).layout.center;
    var point2 = new YPoint(point1.x, point1.y);
    nodeCenters[i] = point2;
  }
  var yList = new YList(nodeCenters);
  var convexHull = Geom.calcConvexHull(yList);
 
  //Searching for a face that contains all nodes of the convexHull.
  var length2 = faceAsNodes.length;
  for (var k = 0; k < length2; k++) {
    var face1 = faceAsNodes[k];
    var face1x = new Array(face1.length);
    var face1y = new Array(face1.length);
    var length3 = face1.length;
    for (var w = 0; w < length3; w++) {
      var c = face1[w];
      var a = c.layout.center;
      face1x[w] = a.x;
      face1y[w] = a.y;
    }
    var b = 0;
    var length4 = convexHull.size;
    for (var j = 0; j < length4; j++) {
      var n = convexHull.get(j);
      for (var r = 0; r < length3; r++) {
        if (face1x[r] == n.x && face1y[r] == n.y) {
          b++;
        }
      }
    }
 
    if (b == convexHull.size) {
      var myOuterface = faceAsNodes[k];
      break;
    }
  }

  return myOuterface;

}
 
 
//Checks if the given graph is an inner triangulation
function checkTriangularity() {
  const graph = graphComponent.graph;
  var nodes = graph.nodes;
  const faces = findFaces2();
  const faceAsNodes = findFaces3(faces);
  //Calculating the convex hull of the centers of all nodes
  var nodeCenters = new Array(nodes.size);
  var length = nodes.size;
  for (var i = 0; i < length; i++) {
    var point1 = nodes.at(i).layout.center;
    var point2 = new YPoint(point1.x, point1.y);
    nodeCenters[i] = point2;
  }
  var yList = new YList(nodeCenters);
  var convexHull = Geom.calcConvexHull(yList);

  //Searching for a face that contains all nodes of the convexHull.
  var length2 = faceAsNodes.length;
  for (var k = 0; k < length2; k++) {
    var face1 = faceAsNodes[k];
    var face1x = new Array(face1.length);
    var face1y = new Array(face1.length);
    var length3 = face1.length;
    for (var w = 0; w < length3; w++) {
      var c = face1[w];
      var a = c.layout.center;
      face1x[w] = a.x;
      face1y[w] = a.y;
    }
    var b = 0;
    var length4 = convexHull.size;
    for (var j = 0; j < length4; j++) {
      var n = convexHull.get(j);
      for (var r = 0; r < face1.length; r++) {
        if (face1x[r] == n.x && face1y[r] == n.y) {
          b++;
        }
      }
    }
 
    if (b == convexHull.size) {
      var myOuterface = faceAsNodes[k];
      break;
    }
  }

  //Having found the outerface, we check if there is any other face with more than 3 edges (not triangular)
  var bool = true;
  var length5 = faceAsNodes.length;
  for (var r = 0; r < length5; r++) {
    if (faceAsNodes[r].length > 3 && faceAsNodes[r] !== myOuterface) {
      bool = false;
      break;
    }
  }
 
  return bool;
}
 
 //Checks if the given graph is connected
function checkIfConnected() {
  const graph = graphComponent.graph;
  const conComp = new ConnectedComponents();
  const con = conComp.run(graph);
  var bool2 = true;
 
  if (con.components.size == 1) {} else {
    bool2 = false;
  }
 
  return bool2;
}
 
//Check if the given graph is planar
function checkPlanarity() {
 
  const graph = graphComponent.graph;
  var yGraphAdapter = new YGraphAdapter(graph);
  var Ggraph = yGraphAdapter.yGraph;
  var bool = true;
 
  if (PlanarEmbedding.isPlanar(Ggraph) == true) {} else {
    bool = false;
  }
  return bool;
}
 
 
  //Given a node from the main component graph, searches the copy graph (upper left corner grid) for the corresponding node.
function findNodeInCopy(INode) {
  if (typeof(INode) == typeof(graphComponent.graph.nodes.at(0))) {
    const label1 = INode.labels.$f.$f1;
    const found = savedGraph.graph.nodes.find(item => item.labels.$f.$f1 == label1);
    return found;
  } else {
    alert("The input must be an INode! ")
  }
}
 
//Hides the pop-up window
function hidePopup() {
  addClass(document.getElementById('popup'), 'hidden')
   var defaultNodeStyle = new ShapeNodeStyle({
      shape: 'pill',
      fill: '#6a6a6a',
      stroke: '1.5px #6a6a6a'
    })
    var defEdgeStyle = new PolylineEdgeStyle({
    stroke: '1.5px #151515',
  })
  
  var window = savedGraph.graph;
  window.nodes.forEach(item => window.setStyle(item, defaultNodeStyle));
  window.edges.forEach(item => window.setStyle(item, defEdgeStyle));
  window.nodes.forEach(item => savedGraph.highlightIndicatorManager.removeHighlight(item));

}
 
//Changes the style of all edges
function changeEdgesStroke(strok) {
  var graph = graphComponent.graph;
  var edges = graph.edges;
  const newStyle = new PolylineEdgeStyle({
    stroke: strok
  })
  edges.forEach(item => graph.setStyle(item, newStyle))
}
 
//Checks if the neighbors of the node in the reduced graph G_k, are the same in quantity with its neighbors in the original graph, which is equal to:
//checking if the node u_k has at least one neighbor on G-G_k
function checkNeighborhood(node) {
  var copied = findNodeInCopy(node);
  if (savedGraph.graph.neighbors(copied).size == graphComponent.graph.neighbors(node).size) {
    return false;
  } else {
    return true;
  }
}
 
 
//Before removing a node u_k+1, we check if its neighbors are consecutive on the outerface of G_k
//We do this by traversing the outerface by choosing the next CCW edge every time
//Once we find one of the neighbors we start counting and we increase if the next consecutive node is also one of the neighbors
//If when we meet one node that is not one of the neighbors, the counter equals to the number of the neighbors, then the condition is met.
//While traversing we want to ignore the node to be removed, so if we stumble upon it, we just move to the next CCW edge.
function checkConsecutiveNeighbors(node, list, u1, u2) {
  const edge12 = graphComponent.graph.edges.find(item => (item.sourceNode == u1 && item.targetNode == u2) | (item.sourceNode == u2 && item.targetNode == u1));
  var counter5 = 0;
  var leftest = null;
  var edge2 = null;
  var bool = false;
  if (u1.layout.center.x > u2.layout.center.x) {
    leftest = u2;
    //getNextCCWEdge takes as input an edge and one of its end-nodes and it proceeds to find the next CCW Edge that starts from the other end-node 
    var edge = getNextCCWEdge(edge12, leftest);
    if (edge.sourceNode == node || edge.targetNode == node) {
      edge2 = getNextCCWEdge(edge, node);
      edge = edge2;
    }
    leftest = u1;
  } else {
    leftest = u1;
    var edge = getNextCCWEdge(edge12, leftest);
    if (edge.sourceNode == node || edge.targetNode == node) {
      edge2 = getNextCCWEdge(edge, node);
      edge = edge2;
    }
    leftest = u2;
  }
 
  if (list.includes(leftest)) {
    counter5++;
  }
 
 
  while (edge !== edge12) {
 
    var edge1 = getNextCCWEdge(edge, leftest);
    if (edge1.sourceNode == node) {
 
      edge2 = getNextCCWEdge(edge1, node);
      leftest = edge1.targetNode;
      edge1 = edge2;
    } else if (edge1.targetNode == node) {
      edge2 = getNextCCWEdge(edge1, node);
      leftest = edge1.sourceNode;
      edge1 = edge2;
    } else {
      if (edge.sourceNode == leftest) {
        leftest = edge.targetNode;
      } else if (edge.targetNode == leftest) {
        leftest = edge.sourceNode;
      }
    }
    if (list.includes(leftest)) {
      counter5++;
      if (counter5 == list.size) {
        bool = true;
      }
    } else {
      counter5 = 0;
    }
    edge = edge1;
  }
 
  return bool;
}

var startPoint1 = null;
var startPoint = null;
 
function canonicalOrdering() {
  /* 
  faceAsNodes = every item is a face / every item consists of node indices
  faces = every item is a face / every item consists of edges
  */
 
  var graph = graphComponent.graph;
  var nodes = graph.nodes;
 
  const thisRect = setRectangle();
 
  //We find the two lowest nodes, u1 and u2
  var nodeCenters = new Array(nodes.size);
  var length = nodes.size;
  for (var i = 0; i < length; i++) {
    var point1 = nodes.at(i).layout.center;
    var point2 = new YPoint(point1.x, point1.y);
    nodeCenters[i] = point2;
  }
  var yList = new YList(nodeCenters);
  var convexHull = Geom.calcConvexHull(yList);
  const sortedEnumerable1 = convexHull.orderByDescending(entry => entry.y, (a, b) => a - b);
  const sorted = sortedEnumerable1.toArray();
  const lowest1 = sorted[0];
  const lowest2 = sorted[1];
 
  const nnode1 = nodes.find(element => element.layout.center.y == lowest1.y);
  const nnode2 = nodes.find(element => element.layout.center.y == lowest2.y && element !== nnode1);
 
  //We store the Hashcodes of these two nodes, in order to leave them last during the canonical ordering process.
  //Couldnt figure any other way to freeze them 
  const HCNode1 = parseInt(JSON.stringify(nnode1.$$hashCode$0));
  Object.freeze(HCNode1);
  const HCNode2 = parseInt(JSON.stringify(nnode2.$$hashCode$0));
  Object.freeze(HCNode2);
  startPoint1 = lowest1;
  if(lowest2.x<lowest1.x){
    startPoint1=lowest2;
  }
  var startPointx = Math.ceil(startPoint1.x/30)*30
  var startPointy = Math.ceil(startPoint1.y/30)*30

  startPoint = new Point(startPointx, startPointy);

  Object.freeze(startPoint);
 
  const t0 = nodes.size;
  const t = parseInt(JSON.stringify(t0));
  Object.freeze(t);
  var counter = 0;
 
 
  async function Ordering() {
 
    counter++;
    var graph = graphComponent.graph;
    var copyGraph = savedGraph.graph;
    var nodes = graph.nodes;
    var lengthy = nodes.size;
    
    if (counter < (t - 2)) {
      console.time("1");
      const faces = findFaces2();
      console.timeEnd("1");
      console.time("2");
      const faceAsNodes = findFaces3(faces);
      console.timeEnd("2");
      
      //outerface again
 
      var nodeCenters = new Array(nodes.size);
      var length = nodes.size;
      for (var i = 0; i < length; i++) {
        var point1 = nodes.at(i).layout.center;
        var point2 = new YPoint(point1.x, point1.y);
        nodeCenters[i] = point2;
      }
      var yList = new YList(nodeCenters);
      var convexHull = Geom.calcConvexHull(yList);
 

      //Searching for a face that contains all nodes of the convexHull.
      var length2 = faces.length;
      for (var k = 0; k < length2; k++) {
        var face1 = faceAsNodes[k];
        var face1x = new Array(face1.length);
        var face1y = new Array(face1.length);
        var length3 = face1.length;
        for (var w = 0; w < length3; w++) {
          var c = face1[w];
          var a = c.layout.center;
          face1x[w] = a.x;
          face1y[w] = a.y;
        }
        var b = 0;
        var length4 = convexHull.size;
        for (var j = 0; j < length4; j++) {
          var n = convexHull.get(j);
          var length5 = face1.length;
          for (var r = 0; r < length5; r++) {
            if (face1x[r] == n.x && face1y[r] == n.y) {
              b++;
            }
          }
        }
 
        if (b == convexHull.size) {
          var myOuterface = faces[k];
          break;
        }
      } 

      //Creating outerNodes array by finding the myOuterface from faces array and then copying the corresponding face from faceAsNodes array
      var outerNodes = [];
      var length6 = faces.length;
      for (var i = 0; i < length6; i++) {
        if (faces[i] == myOuterface) {
          outerNodes = faceAsNodes[i];
        }
      }
 
      var answer = -1;
      //Select all outer nodes except u_1 and u_2
      var outerNodes2 = outerNodes.filter(item => (item.$$hashCode$0 !== HCNode1 && item.$$hashCode$0 !== HCNode2))
      outerNodes2 = outerNodes2.sort((a, b) => a.layout.center.y - b.layout.center.y);
      var outerNodesChords = new Array(outerNodes2.length);
      outerNodesChords.fill(0);

      //Checks if there is any edge between two outer nodes, that is not on the outerface (a chord)
      var length7 = outerNodes2.length;
      for (var w = 0; w < length7; w++) {
        var oNode = outerNodes2[w];
        var length8 = outerNodes.length;
        for (var e = 0; e < length8; e++) {
          var oNode2 = outerNodes[e];
          if (graph.neighbors(oNode).includes(oNode2)) {
            var conEdge = graph.edges.find(item => (item.sourceNode == oNode && item.targetNode == oNode2) || (item.sourceNode == oNode2 && item.targetNode == oNode))
            if (!myOuterface.includes(conEdge)) {
              outerNodesChords[w] = 1;
            }
          }
        }
      }
 
      for (var r = 0; r < length7; r++) {
        var possible = outerNodes2[r];
        
        const u1 = graphComponent.graph.nodes.find(item => item.$$hashCode$0 == HCNode1)
        const u2 = graphComponent.graph.nodes.find(item => item.$$hashCode$0 == HCNode2)

        //check if the node u_k has at least one neighbor on G-G_k
        //check if the node has 0 chords
        //check if their neighbors are consecutive on the outerface of G_k-1
        if ((checkNeighborhood(possible) == true || graph.nodes.size == t) && outerNodesChords[r] == 0 && checkConsecutiveNeighbors(possible, graph.neighbors(possible), u1, u2) == true) {
 
          answer = graph.nodes.findIndex(item => item == possible);
          break;
        }
 
      }
 
      //If we find an appropriate node, we place it in the ordering, and we give it the correctly numbered label
      if (answer !== -1) {
        var n = nodes.at(answer);
        Array.prototype.unshift.call(orderedNodes, n);
        const found = findNodeInCopy(n);
        const label1 = "0" + JSON.stringify(t - counter + 1);
        copyGraph.remove(found.labels.get(0))
        copyGraph.addLabel(found, label1);
        var style2 = new ShapeNodeStyle({
          shape: 'pill',
          fill: '#7a137f',
          stroke: '1.5px #7a137f'
        })
        graph.setStyle(n, style2);
        var style3 = new PolylineEdgeStyle({
          stroke: '6.0px #b96df2'
        })
       
        var edges1 = graph.edgesAt(n);
        edges1.forEach(item => graph.setStyle(item, style3));
        await snapshot(thisRect);
        graph.remove(n);
      }
 
    } else if (lengthy == 3) {
      for (var w = 0; w < lengthy; w++) {
        var Node3 = nodes.at(w);
        var thisHC3 = Node3.$$hashCode$0;
        if (thisHC3 !== HCNode1 && thisHC3 !== HCNode2) {
          Array.prototype.unshift.call(orderedNodes, Node3);
          const found = findNodeInCopy(Node3);
          const label1 = "0" + JSON.stringify(t - counter + 1);
          copyGraph.remove(found.labels.get(0))
          copyGraph.addLabel(found, label1)
          var style2 = new ShapeNodeStyle({
            shape: 'pill',
            fill: '#7a137f',
            stroke: '1.5px #7a137f'
          })
          graph.setStyle(Node3, style2);
          var style3 = new PolylineEdgeStyle({
            stroke: '6.0px #b96df2'
          })

          
          var edges1 = graph.edgesAt(Node3);
          edges1.forEach(item => graph.setStyle(item, style3));
          await snapshot(thisRect);
          graph.remove(Node3);
 
 
          break;
        }
      }
    } else if (nodes.size == 2) 
    {var style3 = new PolylineEdgeStyle({
      stroke: '6.0px #b96df2'
    })
      Array.prototype.unshift.call(orderedNodes, nodes.at(0));
      Array.prototype.unshift.call(orderedNodes, nodes.at(1));
 
      const found = findNodeInCopy(nodes.at(1));
      const found2 = findNodeInCopy(nodes.at(0));
      copyGraph.remove(found.labels.get(0))
      copyGraph.addLabel(found, ("0" + JSON.stringify(2)));
      copyGraph.remove(found2.labels.get(0))
      copyGraph.addLabel(found2, ("0" + JSON.stringify(1)));
      graph.edgesAt(nodes.at(1)).forEach(item => graph.setStyle(item, style3));
      await snapshot(thisRect);
      graph.remove(nodes.at(1));
      await snapshot(thisRect);
      graph.remove(nodes.at(0));
      document.getElementById("co").disabled = true; 
    }
 
    await snapshot(thisRect);
  }
 
  canonicalOrdering.Ordering = Ordering;
  return orderedNodes;
}
 
const copyNodes2 = [];
 

function initializeHoverMode(){
const graphViewerInputMode = new GraphViewerInputMode({
  toolTipItems: GraphItemTypes.LABEL_OWNER,
  clickableItems: GraphItemTypes.NODE,
  focusableItems: GraphItemTypes.NODE,
  selectableItems: GraphItemTypes.NONE,
  marqueeSelectableItems: GraphItemTypes.NONE
})
graphViewerInputMode.itemHoverInputMode.enabled = true
  // set the items to be reported
  graphViewerInputMode.itemHoverInputMode.hoverItems = GraphItemTypes.NODE
  // if there are other items (most importantly labels) in front of edges or nodes
  // they should be discarded, rather than be reported as "null"
  graphViewerInputMode.itemHoverInputMode.discardInvalidItems = false
  // whenever the currently hovered item changes call our method
  graphViewerInputMode.itemHoverInputMode.addHoveredItemChangedListener((sender, evt) =>
  onHoveredItemChanged(evt.item)
  )
  graphComponent.inputMode = graphViewerInputMode;
}



 
async function shiftMethod() {

  initializeHoverMode();
  initializePopups(graphComponent);

  const graph = graphComponent.graph;
  const copyGraph = savedGraph.graph;
  const copyNodes = copyGraph.nodes;
  var counter = 0;
  const t = copyNodes.size;
  snapshots.length = 0;
  const thisRect2 = setRectangle2();
  await snapshot(thisRect2);
 
  //Creating copyNodes2 array, which consists of all the nodes in the copy graph, sorted according to their labels
  for (var i = 0; i < t; i++) {
    const aNode = copyNodes.find(item => item.labels.$f.$f1 == "0" + JSON.stringify(i + 1));
    copyNodes2[i] = aNode;
  }
 
  const newNodes = [];
 
  async function Step() {
    var defaultNodeStyle = new ShapeNodeStyle({
      shape: 'pill',
      fill: '#6a6a6a',
      stroke: '1.5px #6a6a6a'
    })    
 
        //Creates a colorful outline for any shiftSet 
        function shiftSetNode() {
          var randomColor = chooseColor();
    
          const p = new Rect(0, 0, 22, 22);
          var transparent = new ShapeNodeStyle({
            shape: 'pill',
            fill: '#00FFFFFF',
            stroke: '3.5px ' + randomColor
          })
    
          var retNode = graph.createNode();
          graph.setStyle(retNode, transparent);
          graph.setNodeLayout(retNode, p);
          return [retNode, randomColor];
    
        }
 
    //Copy nodes from copy graph to main graph, one at each step, starting by the one labeled 01 and moving
    if (counter < copyNodes.size) {
      const bNode = copyNodes2[counter];
      if(counter>=3){
        myOuterface=findOuterface();
      }
      if(counter==0){
        //initialize the blue-colored background node
        var dimensions = new Rect(0,0,1,1);
        backgroundNode = graph.createNode(dimensions);
      }
      const p = new Rect(0, 0, 20, 20);
      const b = graph.createNode();
 
      graph.setNodeLayout(b, p);
      graph.setStyle(b, defaultNodeStyle);
      
      var label1 =  JSON.stringify(counter + 1);
      newNodes[counter] = b;
      //find the neighboring relations with already copied nodes
      //we retrieve the neighboring relations from the copy graph
      for (var j = 0; j < counter; j++) {
        const cNode = copyNodes2[j];
        if (isNeighbor(bNode, cNode)) {
          const neighbor = newNodes[j];
          graph.createEdge(b, neighbor);
        }
      }
 
      //place first three nodes

      var stylev = new VoidNodeStyle();
 
      if (counter == 0) {
        graph.setStyle(backgroundNode,stylev);
        const point = new Point(startPoint.x, startPoint.y);
        graph.setNodeCenter(b, point);
        graph.addLabel(b,'1')
        await snapshot(thisRect2);
      }
 
 
 
      if (counter == 1) {
        const point = new Point(startPoint.x +60, startPoint.y);
        graph.setNodeCenter(b, point);
        
        graph.addLabel(b,'2')
        await snapshot(thisRect2);
      }
 
      if (counter == 2) {
        const point = new Point(startPoint.x+30, startPoint.y-30);
        graph.setNodeCenter(b, point);
        
        graph.addLabel(b,'3')
        await snapshot(thisRect2);
        myOuterface=findOuterface();
        colorInside(myOuterface);
      }
      
      if (counter > 2) {

        const blueStyle = new ShapeNodeStyle({
          shape: 'pill',
          fill: '#0000FF',
          stroke: '1.5px #0000FF'
        }) 

 
        const neighbors = graph.neighbors(b);
        const leftMost = leftest(neighbors);
        const rightMost = rightest(neighbors);
        graph.setStyle(leftMost, blueStyle);
        graph.setStyle(rightMost, blueStyle);

        var eStylev = new VoidEdgeStyle();

        var aStyle1 = new PolylineEdgeStyle({
          stroke: '1.5px #EE4B2B'
        })

        var topMost = leftMost;

        if (leftMost.layout.center.y > rightMost.layout.center.y) {
          topMost = rightMost;
        }

        //these are for viewing purposes
        //firstly we hide the new node, and we create two vertical red lines in between the leftest and rightest neighbor 
        graph.setStyle(b, stylev);
        graph.edgesAt(b).forEach(item => graph.setStyle(item, eStylev));
        const p11 = new Point(leftMost.layout.center.x + 10, topMost.layout.center.y - 90);
        const p12 = new Point(leftMost.layout.center.x + 10, startPoint.y +65);
 
        var n1 = graph.createNodeAt(p11, stylev);
        var n2 = graph.createNodeAt(p12, stylev);
        graph.createEdge(n1, n2, aStyle1);
 
        const p21 = new Point(rightMost.layout.center.x - 10, topMost.layout.center.y - 90);
        const p22 = new Point(rightMost.layout.center.x - 10, startPoint.y +65);
 
        var n11 = graph.createNodeAt(p21, stylev);
        var n22 = graph.createNodeAt(p22, stylev);
        graph.createEdge(n11, n22, aStyle1);
        
        const intNeighbors = internalNeighbors(b);
       
        await snapshot(thisRect2);
        
        //remove those lines 
        graph.remove(n1);
        graph.remove(n2);
        graph.remove(n11);
        graph.remove(n22);
        

 
        function getChildren(node) {
          var neighbors = graph.neighbors(node);
          var children = neighbors.filter(item => (item.layout.center.y > node.layout.center.y && item.labels.size>0));
          return children;
        }

        function pushChildren(array, node){
          if(getChildren(node).filter(item => item !== leftest(getChildren(node)) && item !== rightest(getChildren(node)) && item!==b) == undefined){
            return;
          }
          else {
            var kids = getChildren(node).filter(item => item !== leftest(getChildren(node)) && item !== rightest(getChildren(node)) && item!==b);
            for(var i=0; i<kids.size; i++){
              array.push(kids.at(i));
              pushChildren(array, kids.at(i));
            }
          }
          
        }
        
        //move all nodes that are right to the leftmost neighbor (and their internal children / covering sets) by one grid square
        //move all nodes that are right to the rightmost neighbor(including the rightmost, and their internal children / covering sets) by one extra grid square, 2 in total  
        //also move the highlights of each node with it 
        var length14 = newNodes.length; 
        var move1 = [];
        var move2 = [];
        var move11 = [];
        var move21 = [];
        for (var l = 0; l < length14-1; l++) {
 
          var children1 = getChildren(newNodes[l]);
          var children = children1.filter(item => item !== b)
          var midChildren = children.filter(item => item !== leftest(children) && item !== rightest(children));

          
          
         
          if (myOuterface.includes(newNodes[l]) && newNodes[l].layout.center.x > leftMost.layout.center.x && newNodes[l].layout.center.x < rightMost.layout.center.x && newNodes[l]!==b){
            move11.push(newNodes[l]);
            pushChildren(move11, newNodes[l])

          }
          else if(myOuterface.includes(newNodes[l]) && newNodes[l].layout.center.x >= rightMost.layout.center.x && newNodes[l]!==b){
            move21.push(newNodes[l]);
            pushChildren(move21, newNodes[l])
          }

        }
           for(var i5=0; i5<move11.length; i5++){
              if(move1.find(item=> item.labels.$f.$f1 == move11[i5].labels.$f.$f1)==undefined){
                move1.push(move11[i5])
              }
            }
            
            for(var i6=0; i6<move21.length; i6++){
              if(move2.find(item=>item.labels.$f.$f1 == move21[i6].labels.$f.$f1)==undefined){
                move2.push(move21[i6])
              }
            }



         

          for(var i1=0; i1<move1.length; i1++){
            
              move11.push(move1[i1]);
            var allCenter =  new Point(move1[i1].layout.center.x+30,move1[i1].layout.center.y );
            var highlights = graph.getChildren(move1[i1]);
            graph.setNodeCenter(move1[i1],allCenter);
            if(highlights!==undefined){
              for(var i2=0; i2<highlights.size; i2++){
                var thisHighlight = highlights.at(i2);
                graph.setNodeCenter(thisHighlight, allCenter);
              }
            }
          
          }

          for(var i3=0; i3<move2.length; i3++){
            
              move21.push(move2[i3]);
            var allCenter =  new Point(move2[i3].layout.center.x+60,move2[i3].layout.center.y );
            var highlights = graph.getChildren(move2[i3]);
            graph.setNodeCenter(move2[i3],allCenter);
            if(highlights!==undefined){
              for(var i4=0; i4<highlights.size; i4++){
                var thisHighlight = highlights.at(i4);
                graph.setNodeCenter(thisHighlight, allCenter);
              }
            }
          
        }


        //Find the position of the new node to be copied, in relation to their leftmost and rightmost neighbors' positions.
        const x = 1 / 2 * (rightMost.layout.center.x + leftMost.layout.center.x - rightMost.layout.center.y + leftMost.layout.center.y);
        const y = -1 / 2 * (rightMost.layout.center.x - leftMost.layout.center.x - rightMost.layout.center.y - leftMost.layout.center.y);
        const point = new Point(x, y);
        graph.setNodeCenter(b, point);

        await colorInside(myOuterface);

        //creates the dashed red lines that intersect in the new node's position
        var aStyle = new PolylineEdgeStyle({
          stroke: '1.5px dashed #EE4B2B'
        })
 
        const lim = graph.edgesAt(b).filter(item => graph.edgesAt(leftMost).includes(item) || graph.edgesAt(rightMost).includes(item));
        lim.forEach(item => graph.setStyle(item, aStyle));
        
        
        await snapshot(thisRect2);
       
        //make the new node and its edges visible
        var style = new ShapeNodeStyle({
          shape: 'pill',
          fill: '#6a6a6a',
          stroke: '1.5px #6a6a6a'
        })
        var style11 = new PolylineEdgeStyle({
          stroke: '1.5px #151515'
        })
        graph.setStyle(b, style);
        let label2 = counter+1;
        let label3 = label2.toString();
        graph.addLabel(b, label3);
 
        const graphCopier = new GraphCopier();
       graph.edgesAt(b).forEach(item => graph.setStyle(item, style11));
        
        //create visuals for the new node's covering nodes
        var intChildren = intNeighbors.filter(item => item.layout.center.y > b.layout.center.y);
        if (intChildren.size > 0) {
          const [yourNode, yourColor] = shiftSetNode();
 
          var colored = new PolylineEdgeStyle({
            stroke: '3px ' + yourColor
          })
 
          var center1 = b.layout.center;
          var corner1 = new Point(center1.x - 11, center1.y - 11)
          var copiedNode = graphCopier.copyNode(graph, graph, yourNode, corner1);
          graph.setParent(copiedNode, b);
 
          var length1 = intChildren.size;
          for (var i = 0; i < length1; i++) {
            var theEdge = graph.edges.find(item => (item.sourceNode == intChildren.at(i) && item.targetNode == b) | (item.targetNode == intChildren.at(i) && item.sourceNode == b));
            graph.setStyle(theEdge, colored);
            var center = intChildren.at(i).layout.center;
 
            //if the node already has a colored perimeter, then increase the size of the new one and add it as well
            if (graph.getChildren(intChildren.at(i)).size > 0) {
              var size = graph.getChildren(intChildren.at(i)).size;
              var diff = 15 + 7 * (size + 1);
              var cornerr = new Point(center.x - diff / 2, center.y - diff / 2);
              var copied = graphCopier.copyNode(graph, graph, yourNode, cornerr);
              graph.setParent(copied, intChildren.at(i));
              var rect1 = new Rect(cornerr.x, cornerr.y, diff, diff);
              graph.setNodeLayout(copied, rect1);
            } else {
              var corner = new Point(center.x - 11, center.y - 11)
              var copied = graphCopier.copyNode(graph, graph, yourNode, corner);
              graph.setParent(copied, intChildren.at(i));
            }
          
          }
          graph.remove(yourNode);
          
        }
     
        
        
        //update the blue-colored background node size/shape
        console.time("3");
        var myOuterface=findOuterface();
        console.timeEnd("3");
        await colorInside(myOuterface);
        await snapshot(thisRect2);
        
        //return all graph elements to their initial styles
        graph.setStyle(leftMost, style);
        graph.setStyle(rightMost, style);
        savedGraph.graph.setStyle(bNode, defaultNodeStyle);
        savedGraph.highlightIndicatorManager.removeHighlight(bNode);
 
        if (intNeighbors !== undefined) {
          intNeighbors.forEach(item => graph.setStyle(item, style));
        }

      }
      
    }
    counter++;

    //remake the edges, in order to appear above the blue-colored background node
    var length1i = graph.edges.size;
    for(var i=0; i<length1i; i++){
      var edge = graph.edges.at(i);
      var style = edge.style;
      var source = graph.nodes.find(item=> item==edge.sourceNode);
      var target = graph.nodes.find(item=> item==edge.targetNode);
      graph.remove(edge);
      graph.createEdge(source,target,style);
    }
    if (counter == t) {
      document.getElementById("sm").disabled = true; 
    }
  }
 
  shiftMethod.Step = Step;
}

var backgroundNodeCounter =0;
var backgroundNode=null;

//refreshes the blue-colored background node's dimensions by traversing the outerface
async function colorInside(myOuterface){
  var graph = graphComponent.graph;
  var myPath = new GeneralPath()

  if(myOuterface!==undefined){
  var firstNode=myOuterface[0];

  var x= firstNode.layout.center.x
  var y = firstNode.layout.center.y;

  myPath.moveTo(x,y);
  var length = myOuterface.length;
  for(var i=1; i<length; i++){

    myPath.lineTo(myOuterface[i].layout.center.x, myOuterface[i].layout.center.y);

  }
  myPath.close();
    
  var styling =  new GeneralPathNodeStyle({
    fill: '#3909630d',
    path: myPath
  })

  graph.setStyle(backgroundNode, styling);
  }
  backgroundNodeCounter++
}

//shows the pop-up that was hidden
function showPopup() {
    removeClass(document.getElementById('popup'), 'hidden')
}

function initializeHighlightStyles() {
    // we want to create a non-default nice highlight styling
    // for the hover highlight, create semi transparent yellow stroke first
    const yellowish = Color.YELLOW
    const yellowStroke = new Stroke(yellowish.r, yellowish.g, yellowish.b, 220, 3).freeze()

    // nodes should be given a yellow circular highlight shape
    const highlightShape = new ShapeNodeStyle({
      shape: ShapeNodeShape.PILL,
      stroke: yellowStroke,
      fill: null
    })

  
    const nodeStyleHighlight = new NodeStyleDecorationInstaller({
      nodeStyle: highlightShape,
      // that should be slightly larger than the real node
      margins: new Insets(5),
      // but have a fixed size in the view coordinates
      zoomPolicy: StyleDecorationZoomPolicy.VIEW_COORDINATES
    })

    const decorator = graphComponent.graph.decorator;
    const decorator2 = savedGraph.graph.decorator;
    
    decorator.nodeDecorator.highlightDecorator.setImplementation(nodeStyleHighlight);
    decorator2.nodeDecorator.highlightDecorator.setImplementation(nodeStyleHighlight);

    // a similar style for the edges, however, cropped by the highlight's insets
    const dummyCroppingArrow = new Arrow({
      type: ArrowType.NONE,
      cropLength: 5
    })

    const edgeStyle = new PolylineEdgeStyle({
      stroke: yellowStroke,
      targetArrow: dummyCroppingArrow,
      sourceArrow: dummyCroppingArrow
    })
    const edgeStyleHighlight = new EdgeStyleDecorationInstaller({
      edgeStyle,
      zoomPolicy: StyleDecorationZoomPolicy.VIEW_COORDINATES
    })

    const bezierEdgeStyle = new BezierEdgeStyle({
      stroke: yellowStroke,
      targetArrow: dummyCroppingArrow,
      sourceArrow: dummyCroppingArrow
    })
    const bezierEdgeStyleHighlight = new EdgeStyleDecorationInstaller({
      edgeStyle: bezierEdgeStyle,
      zoomPolicy: StyleDecorationZoomPolicy.VIEW_COORDINATES
    })

  decorator.edgeDecorator.highlightDecorator.setFactory(edge =>
      edge.style instanceof BezierEdgeStyle ? bezierEdgeStyleHighlight : edgeStyleHighlight
    )
}

//returns all neighbors of the node, except the leftest and the rightest
function internalNeighbors(Node) {
  const neighbors = graphComponent.graph.neighbors(Node);
  if (neighbors.size > 0) {
    var leftMost = leftest(neighbors);
    var rightMost = rightest(neighbors);
    const neighbors2 = neighbors.filter(item => (item !== leftMost && item !== rightMost))
    return neighbors2;
  }
}

//returns the leftest of the nodes given
function leftest(nodeList) {
  var min = nodeList.at(0).layout.center.x;
  var index = 0;
  var length =  nodeList.size;
  for (var i = 1; i <length; i++) {
    if (nodeList.at(i).layout.center.x < min) {
      min = nodeList.at(i).layout.center.x;
      index = i;
    }
  }
  const finalNode = nodeList.at(index);
  return finalNode;
}


//returns the rightest of the nodes given
function rightest(nodeList) {
  var max = nodeList.at(0).layout.center.x;
  var index = 0;
  var length = nodeList.size;
  for (var i = 1; i < length; i++) {
    if (nodeList.at(i).layout.center.x > max) {
      max = nodeList.at(i).layout.center.x;
      index = i;
    }
  }
  const finalNode = nodeList.at(index);
  return finalNode;
}

//highlights the hovering node's internal children and its descendants
function highlightDescendantsOnHover(node) {

  const manager = graphComponent.highlightIndicatorManager;
  if (node == null ) {
    return
  }
  //if there is no label, this is a color highlight node that is used to define the covering sets
  //in that case we search for the appropriate node in the same location
  if( node.labels.size == 0 ){
     node = graphComponent.graph.nodes.find(item=>item.layout.center.x == node.layout.center.x && item.layout.center.y == node.layout.center.y && item.labels.size>0 )

  }
  manager.addHighlight(node)
  var childrenakia = graphComponent.graph.neighbors(node).filter(item => item.layout.center.y > node.layout.center.y);
  
    if(childrenakia!==undefined){
    var intChildren = childrenakia.filter(item=>item !== leftest(childrenakia) && item!==rightest(childrenakia))
    
    if(intChildren!==undefined){
    var length = intChildren.size;
    for (var i=0; i<length; i++) {
      var child = intChildren.at(i);
      const edgeBetween = graphComponent.graph.edges.find(item => (item.sourceNode == child && item.targetNode == node) | (item.sourceNode == node && item.targetNode == child));
      manager.addHighlight(edgeBetween);
      highlightDescendantsOnHover(child);
    }
  } 
    }

  
}



function onHoveredItemChanged(node) {
  // we use the highlight manager of the GraphComponent to highlight related items
  if(node==backgroundNode){
    return
  }
  const manager = graphComponent.highlightIndicatorManager;

  // first remove previous highlights
  manager.clearHighlights()
  
  //then highlight the new hover node
  highlightDescendantsOnHover(node);
  
  
}

 
function searchLeftmostNode() {
  const graph = graphComponent.graph;
  const nodes = graph.nodes;
  var min = nodes.at(0).layout.center.x;
  var index = 0;
  var length = nodes.size;
  for (var i = 1; i < length; i++) {
    if (nodes.at(i).layout.center.x < min) {
      min = nodes.at(i).layout.center.x;
      index = i;
    }
  }
  const finalNode = nodes.at(index);
  return finalNode;
}
 
function searchRightmostNode() {
  const graph = graphComponent.graph;
  const nodes = graph.nodes;
  var max = nodes.at(0).layout.center.x;
  var index = 0;
  var length = nodes.size;
  for (var i = 1; i < length; i++) {
    if (nodes.at(i).layout.center.x > max) {
      max = nodes.at(i).layout.center.x;
      index = i;
    }
  }
  const finalNode = nodes.at(index);
  return finalNode;
}
 
function searchLowmostNode() {
  const graph = graphComponent.graph;
  const nodes = graph.nodes;
  var max = nodes.at(0).layout.center.y;
  var index = 0;
  var length = nodes.size;
  for (var i = 1; i < length; i++) {
    if (nodes.at(i).layout.center.y > max) {
      max = nodes.at(i).layout.center.y;
      index = i;
    }
  }
  const finalNode = nodes.at(index);
  return finalNode;
}
 
function searchTopmostNode() {
  const graph = graphComponent.graph;
  const nodes = graph.nodes;
  var min = nodes.at(0).layout.center.y;
  var index = 0;
  var length = nodes.size;
  for (var i = 1; i < length; i++) {
    if (nodes.at(i).layout.center.y < min) {
      min = nodes.at(i).layout.center.y;
      index = i;
    }
  }
  const finalNode = nodes.at(index);
  return finalNode;
}
 
function setRectangle() {
  const x1 = searchLeftmostNode().layout.center.x - 60;
  const y1 = searchTopmostNode().layout.center.y - 60;
 
  const width = searchRightmostNode().layout.center.x - searchLeftmostNode().layout.center.x + 120;
  const height = searchLowmostNode().layout.center.y - searchTopmostNode().layout.center.y + 120;
 
  const rect = new MutableRectangle(x1, y1, width, height);
  return rect;
 
}
 
function setRectangle2() {
  const n = savedGraph.graph.nodes.size;
  const y = startPoint.y -(n - 1) * 30;
  const width = (2 * n) * 30;
  const height = n * 30;
  const rect = new MutableRectangle(startPoint.x-60, y, width, height);
  return rect;
}
 
async function snapshot(exportRect) {
  const rectangle = new Rect(exportRect);
  clientSideImageExport.scale = 1
  clientSideImageExport.margins = new Insets(5)
  const image = await clientSideImageExport.exportImage(graphComponent.graph, rectangle)
  snapshots.push(image);
}

function isNeighbor(Node1, Node2) {
  return (savedGraph.graph.neighbors(Node1).includes(Node2));
}
 
var count = 0;
var count2 = 0;
 
function showClientExportDialog(pngImage) {
  //const saveButton = document.getElementById('clientPngSaveButton')
  const imageContainerInner = document.getElementById('imageContainerInner')
  imageContainerInner.innerHTML = ''
 
  if (pngImage === null) {

  } else {
    imageContainerInner.appendChild(pngImage);
  }
  showPopup()
}
 
let indx = 0;
 
function showPrevious() {
  indx = indx - 1;
  var defaultNodeStyle = new ShapeNodeStyle({
    shape: 'pill',
    fill: '#6a6a6a',
    stroke: '1.5px #6a6a6a'
  })
 
  var defEdgeStyle = new PolylineEdgeStyle({
    stroke: '1.5px #151515',
  })
 
  var redStyle = new ShapeNodeStyle({
    shape: 'pill',
    fill: '#7a137f',
    stroke: '1.5px #7a137f'
  })
 
  var newEdgeStyle = new PolylineEdgeStyle({
    stroke: '5px #151515',
  })
 
  if (indx == 2 | indx == 0 | indx == 1) {
    const p = new Rect(copyNodes2[indx].layout.center.x - 5, copyNodes2[indx].layout.center.y - 5, 10, 10);
    //revert all the styling made on the top left corner graph
    savedGraph.graph.setNodeLayout(copyNodes2[indx], p);
    savedGraph.graph.setStyle(copyNodes2[indx], defaultNodeStyle);
    savedGraph.highlightIndicatorManager.removeHighlight(copyNodes2[indx]);
    savedGraph.graph.edgesAt(copyNodes2[indx]).forEach(item => savedGraph.graph.setStyle(item, defEdgeStyle));
 
    //add styling to the relevant nodes and edges
    const p2 = new Rect(copyNodes2[indx - 1].layout.center.x - 10, copyNodes2[indx - 1].layout.center.y - 10, 20, 20);
    savedGraph.graph.setNodeLayout(copyNodes2[indx - 1], p2);
    savedGraph.graph.setStyle(copyNodes2[indx - 1], redStyle);
    savedGraph.highlightIndicatorManager.addHighlight(copyNodes2[indx-1]);

    var edges = savedGraph.graph.edgesAt(copyNodes2[indx - 1]);
    var length = edges.size;
    for (var i = 0; i < length; i++) {
      var thisOne = edges.at(i);
      var otherNode = null;
      if (copyNodes2[indx - 1] == thisOne.sourceNode) {
        otherNode = thisOne.targetNode;
      } else {
        otherNode = thisOne.sourceNode;
      }
      var otherNodeIndex = copyNodes2.findIndex(item => item == otherNode);
      if (otherNodeIndex < indx - 1) {
        savedGraph.graph.setStyle(thisOne, newEdgeStyle)
      }
    }
 
  }
  
  //revert and change styling made on the top left corner graph, only if it is a crucial step (once every three steps)
  if (indx >= 3 && indx % 3 == 0) {
    const indx2 = Math.ceil(indx / 3) + 2;
    const p = new Rect(copyNodes2[indx2].layout.center.x - 5, copyNodes2[indx2].layout.center.y - 5, 10, 10);
    savedGraph.graph.setNodeLayout(copyNodes2[indx2], p);
    savedGraph.graph.setStyle(copyNodes2[indx2], defaultNodeStyle);
    savedGraph.highlightIndicatorManager.removeHighlight(copyNodes2[indx2]);
    savedGraph.graph.edgesAt(copyNodes2[indx2]).forEach(item => savedGraph.graph.setStyle(item, defEdgeStyle));
 
    const p2 = new Rect(copyNodes2[indx2 - 1].layout.center.x - 10, copyNodes2[indx2 - 1].layout.center.y - 10, 20, 20);
    savedGraph.graph.setNodeLayout(copyNodes2[indx2 - 1], p2);
    savedGraph.graph.setStyle(copyNodes2[indx2 - 1], redStyle);
    savedGraph.highlightIndicatorManager.addHighlight(copyNodes2[indx2-1]);
  }
 
  showSnapshots(indx);
 
  //disable the previous button when there is no previous step
  if (indx == 1) {
    document.getElementById("previousButton").disabled = true;
  }
 
  //disable the next button when there is no next step
  if (indx == snapshots.length - 2) {
    document.getElementById("nextButton").disabled = false;
  }
}
 

function showNext() {
  indx = indx + 1;
  showSnapshots(indx);
  var redStyle = new ShapeNodeStyle({
    shape: 'pill',
    fill: '#7a137f',
    stroke: '1.5px #7a137f'
  })
  var defaultNodeStyle = new ShapeNodeStyle({
    shape: 'pill',
    fill: '#6a6a6a',
    stroke: '1.5px #6a6a6a'
  })
  var newEdgeStyle = new PolylineEdgeStyle({
    stroke: '5px #151515',
  })
 
  if (copyNodes2.length > 0) {
 
    if (indx == 1) {
 
      //style the corresponding node in the top left corner graph 
      const p = new Rect(copyNodes2[indx - 1].layout.center.x - 10, copyNodes2[indx - 1].layout.center.y - 10, 20, 20);
      savedGraph.graph.setNodeLayout(copyNodes2[indx - 1], p);
      savedGraph.graph.setStyle(copyNodes2[indx - 1], redStyle);
      savedGraph.highlightIndicatorManager.addHighlight(copyNodes2[indx-1]);
 
    }
    if (2 <= indx && indx <= 3) {
 
      //revert all the styling made in the top left corner graph and style the new relevant node and edges
      const p = new Rect(copyNodes2[indx - 1].layout.center.x - 10, copyNodes2[indx - 1].layout.center.y - 10, 20, 20);
      savedGraph.graph.setNodeLayout(copyNodes2[indx - 1], p);
      savedGraph.graph.setStyle(copyNodes2[indx - 2], defaultNodeStyle);
      savedGraph.graph.setStyle(copyNodes2[indx - 1], redStyle)
      savedGraph.highlightIndicatorManager.removeHighlight(copyNodes2[indx-2]);
      savedGraph.highlightIndicatorManager.addHighlight(copyNodes2[indx-1]);
 
      var edges = savedGraph.graph.edgesAt(copyNodes2[indx - 1]);
      var length = edges.size;
      for (var i = 0; i < length; i++) {
        var thisOne = edges.at(i);
        var otherNode = null;
        if (copyNodes2[indx - 1] == thisOne.sourceNode) {
          otherNode = thisOne.targetNode;
        } else {
          otherNode = thisOne.sourceNode;
        }
        var otherNodeIndex = copyNodes2.findIndex(item => item == otherNode);
        if (otherNodeIndex < indx - 1) {
          savedGraph.graph.setStyle(thisOne, newEdgeStyle)
        }
      }
 
    }
    if (indx >= 4) {
      var in2 = Math.ceil(indx / 3) + 1;
 
      const p = new Rect(copyNodes2[in2].layout.center.x - 10, copyNodes2[in2].layout.center.y - 10, 20, 20);
      savedGraph.graph.setNodeLayout(copyNodes2[in2], p);
      savedGraph.graph.setStyle(copyNodes2[in2 - 1], defaultNodeStyle);
      savedGraph.graph.setStyle(copyNodes2[in2], redStyle);
      savedGraph.highlightIndicatorManager.removeHighlight(copyNodes2[in2-1]);
      savedGraph.highlightIndicatorManager.addHighlight(copyNodes2[in2]);
      var edges = savedGraph.graph.edgesAt(copyNodes2[in2]);
      var length = edges.size;
      for (var i = 0; i < length; i++) {
        var thisOne = edges.at(i);
        var otherNode = null;
        if (copyNodes2[in2] == thisOne.sourceNode) {
          otherNode = thisOne.targetNode;
        } else {
          otherNode = thisOne.sourceNode;
        }
        var otherNodeIndex = copyNodes2.findIndex(item => item == otherNode);
        if (otherNodeIndex < in2) {
          savedGraph.graph.setStyle(thisOne, newEdgeStyle)
        }
      }
    }
  }
  
  //disable the next button when there is no next step
  if (indx == snapshots.length - 1) {
    document.getElementById("nextButton").disabled = true;
  }
   
  //disable the previous button when there is no previous step
  if (indx == 2) {
    document.getElementById("previousButton").disabled = false;
  }
}
 
//showcases the snapshots on the pop-up window
function showSnapshots(i) {
  const im = snapshots[i];
  showClientExportDialog(im);
  const imageContainerInner = document.getElementById('imageContainerInner')
  imageContainerInner.appendChild(snapshots[0]);
}
 
 //connects buttons to actions
function registerCommands() {
 
  bindAction("button[data-command='Save']", () => {
    const graph = graphComponent.graph
    const json = writeToJSON(graph)
    FileSaveSupport.save(JSON.stringify(json), 'graph.json')
  })
 
  bindAction("button[data-command='Export']", async () => {
    const scale = 0.8;
    const margin = 5.0;
 
 
    let exportRect = new MutableRectangle(-10, 0, 300, 160);
    const rectangle = new Rect(exportRect);
 
    if (ieVersion === 9) {
      // IE9 requires an older version of canvg, which is not included in this demo anymore.
      // See https://github.com/yWorks/yfiles-for-html-demos/tree/v2.3.0.3/demos/view/imageexport
      // for a compatible version
      showClientExportDialog(null)
    } else {
      // configure export, export the image and show a dialog to save the image
      clientSideImageExport.scale = scale
      clientSideImageExport.margins = new Insets(margin)
      const image = await clientSideImageExport.exportImage(graphComponent.graph, rectangle)
 
 
      showClientExportDialog(image)
    }
 
  })
 
  //Check planarity and triangularity. If the graph is appropriate, copy graph and start the canonical ordering.
 
  bindAction("button[data-command='CanonicalOrdering']", async () => {
 
    if (count == 0) {
     addLabels();
 
      checkIfConnected();
      if (checkIfConnected() == false) {
        count = -1;
        alert("Error! The graph is not connected. Please input a connected graph!")
        return
      }
 
      checkPlanarity();
      if (checkPlanarity() == false) {
        count = -1;
        alert("Your graph is not planar!");
       return 
      }
 
      checkTriangularity();
      if (checkTriangularity() == false) {
        count = -1;
        alert("Your graph is not internally triangulated!")
        return
      }

            //first snapshot with 0.5 stroke of the edges is the background shadow of the graph
      var thisRect = setRectangle();
      var stroke = '0.5px #151515'
      changeEdgesStroke(stroke);
 
      await snapshot(thisRect);
 
      var stroke2 = '1.5px #151515'
      changeEdgesStroke(stroke2);
      await snapshot(thisRect);
 
      copyGraph();
      canonicalOrdering();
 
      while (graphComponent.graph.nodes.size > 0) {
        await canonicalOrdering.Ordering();
      }
      document.getElementById("steps").disabled = false;
      document.getElementById("co").disabled = true; 
    }
 
    count++
  })
  bindAction("button[data-command='steps']", () => {
    showSnapshots(1);
    
  })

  bindAction("button[data-command='steps2']", () => {
    var redStyle = new ShapeNodeStyle({
      shape: 'pill',
      fill: '#7a137f',
      stroke: '1.5px #7a137f'
    })
    indx = 0;
    document.getElementById("previousButton").disabled = true;
    document.getElementById("nextButton").disabled = false;
    removeClass(document.getElementById("savedGraph"), 'hidden');
    savedGraph.fitGraphBounds();
    showSnapshots(0);
    savedGraph.graph.setStyle(copyNodes2[0], redStyle);
    savedGraph.highlightIndicatorManager.addHighlight(copyNodes2[0]);
  })
 
  //Start the Shift Method.
  bindAction("button[data-command='Shift Method']", async () => {
 
    if (count2 == 0) {
      var copyGraph = savedGraph.graph;
      var copyNodes = copyGraph.nodes;
      const t = copyNodes.size;
      await shiftMethod();
      var counting = 0;
      while (counting < t) {
        if(counting==1){
          //graphComponent.fitGraphBounds();
        }
      
        
        await shiftMethod.Step();
       
        counting++;
      }
      graphComponent.fitGraphBounds();
      
      
      document.getElementById("steps").disabled = true;
      document.getElementById("steps2").disabled = false;
      document.getElementById("sm").disabled = true; 
    }
 
     count2++
  })
  
  const kim = graphComponent.inputMode.keyboardInputMode
  const copy = ICommand.createCommand()
  kim.addCommandBinding(copy, copyGraph, () => graphComponent.selection.size > 0)
  bindCommand("button[data-command='Copy']", copy, graphComponent, null)
  kim.addKeyBinding(Key.C, ModifierKeys.NONE, copy)
 
  bindCommand("button[data-command='ZoomIn']", ICommand.INCREASE_ZOOM, graphComponent)
  bindCommand("button[data-command='ZoomIn2']", ICommand.INCREASE_ZOOM, savedGraph)
  bindCommand("button[data-command='ZoomOut']", ICommand.DECREASE_ZOOM, graphComponent)
  bindCommand("button[data-command='ZoomOut2']", ICommand.DECREASE_ZOOM, savedGraph)
  bindCommand("button[data-command='FitContent']", ICommand.FIT_GRAPH_BOUNDS, graphComponent)
  bindCommand("button[data-command='FitContent2']", ICommand.FIT_GRAPH_BOUNDS, savedGraph)
  bindCommand("button[data-command='ZoomOriginal']", ICommand.ZOOM, graphComponent, 1.0)
  bindCommand("button[data-command='Undo']", ICommand.UNDO, graphComponent)
  bindCommand("button[data-command='Redo']", ICommand.REDO, graphComponent)
 
  const support = new GraphMLSupport(graphComponent)
  support.storageLocation = StorageLocation.FILE_SYSTEM
 
  document.querySelector('#openButton').addEventListener('click', () => {
    ICommand.OPEN.execute(null, graphComponent)
    initializeGrid()
    document.getElementById("steps").disabled = true;
    document.getElementById("steps2").disabled = true;
  })
  document.querySelector('#saveButton').addEventListener('click', () => {
    ICommand.SAVE.execute(null, graphComponent)
  })
 
  bindAction('#closeButton', hidePopup)
  bindAction('#previousButton', showPrevious)
  bindAction('#nextButton', showNext)
 
}

run()