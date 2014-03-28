var delta = [ 0, 0 ];
var stage = [ window.screenX, window.screenY, window.innerWidth, window.innerHeight ];
getBrowserDimensions();

var isRunning = false;
var isMouseDown = false;

var worldAABB;
var world;
var edgeBounce;
var iterations = 16;
var timeStep = 1000 / 260; 

var constraints;
var mouseJoint;
var mouse = { x: 0, y: 0 };

var mouseOnClick = [];

var elements = [];
var bodies = [];
var properties = [];

var query, page = 0;

var gWebSearch, gImageSearch;
var imFeelingLuckyMode = false;
var resultBodies = [];

var gravity = { x: 0, y: 1 };
var gravityBehavior;

init();

if ( location.search != "" ) {

  var params = location.search.substr(1).split("&")

  for (var i = 0; i < params.length; i++) {

    var param = params[i].split("=");

    if (param[0] == "q") {

      document.getElementById('q').value = param[1];
      run();
      break;
    }
  }
}

      //

function init() {

/*
  gWebSearch = new google.search.WebSearch();
  gWebSearch.setResultSetSize( google.search.Search.SMALL_RESULTSET );
  gWebSearch.setSearchCompleteCallback( null, onWebSearch );

  gImageSearch = new google.search.ImageSearch();
  gImageSearch.setResultSetSize( google.search.Search.SMALL_RESULTSET );
  gImageSearch.setSearchCompleteCallback( null, onImageSearch );

  document.addEventListener( 'mousedown', onDocumentMouseDown, false );
  document.addEventListener( 'mouseup', onDocumentMouseUp, false );
  document.addEventListener( 'mousemove', onDocumentMouseMove, false );

  document.addEventListener( 'keyup', onDocumentKeyUp, false );


  document.addEventListener( 'touchstart', onDocumentTouchStart, false );
  document.addEventListener( 'touchmove', onDocumentTouchMove, false );
  document.addEventListener( 'touchend', onDocumentTouchEnd, false );

  window.addEventListener( 'deviceorientation', onWindowDeviceOrientation, false );
*/
  // init PhysicsJS

  worldAABB = Physics.aabb.apply(null, stage);

  world = Physics({
    timestep: timeStep,
    maxIPF: iterations
  });

// walls
edgeBounce = Physics.behavior('edge-collision-detection', {
  aabb: worldAABB,
  restitution: 0.4,
  cof: 0.5
});

world.add( edgeBounce );
world.add( Physics.behavior('body-collision-detection', { checkAll: true }) );
world.add( Physics.behavior('sweep-prune') );
world.add( Physics.behavior('body-impulse-response') );

// constraints
constraints = Physics.behavior('verlet-constraints', { iterations: 2 });
world.add( constraints );

// add gravity
gravityBehavior = Physics.behavior('constant-acceleration', { acc: gravity });
world.add( gravityBehavior );

  // Get physics-element elements

  var elements = d3.selectAll(".physics-element")
    
  elements
    .each(getElementProperties) 
    .style("position", "absolute")
    .style("left", function (d) { return (-d.props.y / 2) + 'px'; })
    .style("top", function (d) { return (-d.props.height / 2) + 'px'; })
    .style("width", function (d) { return d.props.width + 'px'; })
    .on("mousedown", onElementMouseDown)
    .on("mouseup", onElementMouseUp)
    .on("click", onElementClick)
    .each(setBody);


  function getElementProperties() {
    var element = this;
    var x = 0, y = 0;
    var width = element.offsetWidth;
    var height = element.offsetHeight;

    do {
      x += element.offsetLeft;
      y += element.offsetTop;
    } while ( element = element.offsetParent );

    //console.log("this", this, {props:{x: x, y: y, width: width, height: height}})
    d3.select(this).datum({props:{x: x, y: y, width: width, height: height}});
  }

  function setBody (d, i) {
    var element = this;
    var body = Physics.body('convex-polygon', {
      x: d.props.x + d.props.width / 2,
      y: d.props.y + d.props.height / 2,
      vertices:[
      { x: 0, y: 0 },
      { x: d.props.width, y: 0 },
      { x: d.props.width, y: d.props.height },
      { x: 0, y: d.props.height }
    ]});

    body.view = this;
    world.add( body );

    while ( element.offsetParent ) {
      element = element.offsetParent;
      element.style.position = 'static';
    }
  }
}

function getBrowserDimensions() {

  var changed = false;

  if ( stage[0] != window.screenX ) {

    delta[0] = (window.screenX - stage[0]) * 50;
    stage[0] = window.screenX;
    changed = true;
  }

  if ( stage[1] != window.screenY ) {

    delta[1] = (window.screenY - stage[1]) * 50;
    stage[1] = window.screenY;
    changed = true;
  }

  if ( stage[2] != window.innerWidth ) {

    stage[2] = window.innerWidth;
    changed = true;
  }

  if ( stage[3] != window.innerHeight ) {

    stage[3] = window.innerHeight;
    changed = true;
  }

  return changed;
}


var renderer = Physics.renderer('dom', {
  el: document.body,
  width: window.innerWidth,
  height: window.innerHeight,
});

world.add( renderer );

world.render();
world.pause();
setTimeout(function () {
  world.unpause();
}, 1000);

Physics.util.ticker.subscribe( loop );
Physics.util.ticker.start();

// magic to trigger GPU
world.subscribe('render', function( data ){
  var style;
  for ( var i = 0, l = data.bodies.length; i < l; ++i ){
    //console.log(i, data.bodies[ i ].state.pos._[1])
    //world.pause();
    var t = data.bodies[ i ].state.pos._[1];
    style = data.bodies[ i ].view.style;
    style.WebkitTransform += t > 300 ? ' translateZ(0) scale(1.0)': ' translateZ(0)';
    style.MozTransform += ' translateZ(0)';
    style.MsTransform += ' translateZ(0)';
    style.transform += ' translateZ(0)';
  }
});

function run() {
  world.unpause();
}

function loop( time ) {

  if (getBrowserDimensions()) setWalls();

  delta[0] += (0 - delta[0]) * .5;
  delta[1] += (0 - delta[1]) * .5;

  gravityBehavior.setAcceleration({ 
    x: gravity.x * 5e-4 + delta[0], 
    y: gravity.y * 5e-4 + delta[1]
  });

  mouseDrag();
  world.step( time );
  // only render if not paused
  if ( !world.isPaused() ){
      world.render();
  }
}

function onElementMouseDown() {

  d3.event.preventDefault();

  mouseOnClick[0] = d3.event.clientX;
  mouseOnClick[1] = d3.event.clientY;

}

function onElementMouseUp() {

  d3.event.preventDefault();

}

function onElementClick() {
  console.log("click!")

  var range = 5;

  if ( mouseOnClick[0] > d3.event.clientX + range || mouseOnClick[0] < d3.event.clientX - range &&
       mouseOnClick[1] > d3.event.clientY + range || mouseOnClick[1] < d3.event.clientY - range ) {
    d3.event.preventDefault();
  }

}

function setWalls() {
  worldAABB = Physics.aabb.apply(null, stage);
  edgeBounce.setAABB( worldAABB );
}

function mouseDrag() {

  // mouse press
  if (isMouseDown && !mouseJoint) {

    var body = getBodyAtMouse();

    if (body) {

      var md = Physics.body('point', {
        x: mouse.x,
        y: mouse.y
      });
      mouseJoint = constraints.distanceConstraint(md, body, 0.2);
    }
  }

  // mouse release
  if (!isMouseDown) {

    if (mouseJoint) {

      constraints.remove( mouseJoint );
      mouseJoint = null;
    }
  }

  // mouse move
  if (mouseJoint) {

    mouseJoint.bodyA.state.pos.set(mouse.x, mouse.y);
  }
}

/*
          bodies[i] = Physics.body('convex-polygon', {
            x: properties[i][0] + properties[i][2]/2,
            y: properties[i][1] + properties[i][3]/2,
            vertices: [
              { x: 0, y: 0 },
              { x: properties[i][2], y: 0 },
              { x: properties[i][2], y: properties[i][3] },
              { x: 0, y: properties[i][3] }
            ]
          });
          bodies[i].view = element;

          // Clean position dependencies

          while ( element.offsetParent ) {

            element = element.offsetParent;
            element.style.position = 'static';

          }

        }

      function getElementProperties(d) {
        var element = this;
        var x = 0;
        var y = 0;
        var width = element.offsetWidth;
        var height = element.offsetHeight;
        
        do {
          
          x += element.offsetLeft;
          y += element.offsetTop;

        } while ( element = element.offsetParent );

        d.props = [ x, y, width, height ];

        d3.select(this).datum(d);
      }



        // add the bodies to the world
        world.add( bodies );
        // renderer
              var renderer = Physics.renderer('dom', {
                el: document.body,
                width: window.innerWidth,
                height: window.innerHeight,
            });
        world.add( renderer );
        // position the views
        world.render();
        world.pause();

        Physics.util.ticker.subscribe( loop );
        Physics.util.ticker.start();

        // magic to trigger GPU
        world.subscribe('render', function( data ){
          var style;
          for ( var i = 0, l = data.bodies.length; i < l; ++i ){
            
            style = data.bodies[ i ].view.style;
            style.WebkitTransform += ' translateZ(0)';
            style.MozTransform += ' translateZ(0)';
            style.MsTransform += ' translateZ(0)';
            style.transform += ' translateZ(0)';
          }
        });
      }

      function run() {

        world.unpause();

      }

      //

      function onDocumentMouseDown( event ) {

        isMouseDown = true;

      }

      function onDocumentMouseUp( event ) {

        isMouseDown = false;

      }

      function onDocumentMouseMove( event ) {

        if ( world.isPaused() ) run();

        mouse.x = event.clientX;
        mouse.y = event.clientY;

      }

      function onDocumentKeyUp( event ) {

        if ( event.keyCode == 13 ) search();

      }

      function onDocumentTouchStart( event ) {

        if ( event.touches.length == 1 ) {

          if ( !isRunning ) {

            run();

          }

          mouse.x = event.touches[0].pageX;
          mouse.y = event.touches[0].pageY;
          isMouseDown = true;
        }
      }

      function onDocumentTouchMove( event ) {

        if ( event.touches.length == 1 ) {

          event.preventDefault();

          mouse.x = event.touches[0].pageX;
          mouse.y = event.touches[0].pageY;

        }

      }

      function onDocumentTouchEnd( event ) {

        if ( event.touches.length == 0 ) {

          isMouseDown = false;
        }

      }

      function onWindowDeviceOrientation( event ) {

        if ( event.beta ) {

          gravity.x = Math.sin( event.gamma * Math.PI / 180 );
          gravity.y = Math.sin( ( Math.PI / 4 ) + event.beta * Math.PI / 180 );

        }

      }

      //

      function onElementMouseDown( event ) {

        event.preventDefault();

        mouseOnClick[0] = event.clientX;
        mouseOnClick[1] = event.clientY;

      }

      function onElementMouseUp( event ) {

        event.preventDefault();

      }

      function onElementClick( event ) {

        var range = 5;

        if ( mouseOnClick[0] > event.clientX + range || mouseOnClick[0] < event.clientX - range &&
             mouseOnClick[1] > event.clientY + range || mouseOnClick[1] < event.clientY - range ) {

          event.preventDefault();

        }

        if ( event.target == document.getElementById( 'btnG' ) ) search();
        if ( event.target == document.getElementById( 'btnI' ) ) imFeelingLucky();
        if ( event.target == document.getElementById( 'q' ) ) document.getElementById('q').focus();

      }

      // API STUFF

      function search() {

        if ( !isRunning ) {

          run();

        }

        if ( query == document.getElementById('q').value ) {

          page ++;

          gWebSearch.gotoPage( page );
          gImageSearch.gotoPage( page );

        } else {

          page = 0;

          query = document.getElementById('q').value;

          gWebSearch.execute( query );
          gImageSearch.execute( query );

        }

        return false;

      }

      function imFeelingLucky() {

        imFeelingLuckyMode = true;
        gWebSearch.execute( document.getElementById('q').value );

        return false;

      }

      function onWebSearch() {

        if ( imFeelingLuckyMode ) {

          location.href = gWebSearch.results[0].unescapedUrl;
          return;

        }

        for ( var i = 0; i < gWebSearch.results.length; i ++ ) {

          addWeb( gWebSearch.results[i] );

        }

      }

      function onImageSearch() {

        for ( var i = 0; i < gImageSearch.results.length; i ++ ) {

          addImage( gImageSearch.results[i] );

        }

      }

      function addWeb( data ) {

        var element = document.createElement('div');
        element.innerHTML = '<div class="result"><div class="title"><a href="' + data.unescapedUrl + '" target="_blank">' + data.title + '</a></div><div class="url">' + data.visibleUrl + '</div><div class="content">' + data.content + '</div>';

        document.body.appendChild( element );

        properties.push( [ Math.random() * ( window.innerWidth / 2 ), - 200, 546, element.offsetHeight ] );

        var i = properties.length - 1;

        element.style.position = 'absolute';
        element.style.left = 0 + 'px';
        element.style.top = - 100 + 'px';
        element.style.backgroundColor = '#ffffff';
        element.addEventListener( 'mousedown', onElementMouseDown, false );
        element.addEventListener( 'mouseup', onElementMouseUp, false );
        element.addEventListener( 'click', onElementClick, false );

        elements[i] = element;

        resultBodies.push( bodies[i] = createBox( world, properties[i][0] + ( properties[i][2] >> 1 ), properties[i][1] + ( properties[i][3] >> 1 ), properties[i][2] / 2, properties[i][3] / 2, false, element ) );

      }

      function addImage( data ) {

        var element = document.createElement( 'img' );
        element.style.display = 'none';
        element.style.cursor = 'pointer';
        element.addEventListener( 'load', function () {

          properties.push( [ Math.random() * ( window.innerWidth / 2 ), - 200, element.width, element.height ] );

          var i = properties.length - 1;

          element.style.display = 'block';
          element.style.position = 'absolute';
          element.style.left = 0 + 'px';
          element.style.top = - 200 + 'px';
          element.style.backgroundColor = '#ffffff';
          element.addEventListener( 'mousedown', onElementMouseDown, false );
          element.addEventListener( 'mouseup', onElementMouseUp, false );
          element.addEventListener( 'click', onElementClick, false );
          element.addEventListener( 'click', function ( event ) {

            var range = 5;

            if ( mouseOnClick[0] < event.clientX + range && mouseOnClick[0] > event.clientX - range &&
                 mouseOnClick[1] < event.clientY + range && mouseOnClick[1] > event.clientY - range ) {

              window.open( data.unescapedUrl );

            }

          }, false );

          elements[i] = element;

          resultBodies.push( bodies[i] = createBox( world, properties[i][0] + ( properties[i][2] >> 1 ), properties[i][1] + ( properties[i][3] >> 1 ), properties[i][2] / 2, properties[i][3] / 2, false, element ) );

        }, false );
        element.src = data.tbUrl;
        document.body.appendChild( element );

      }

      //

      function loop( time ) {

        if (getBrowserDimensions())
          setWalls();

        delta[0] += (0 - delta[0]) * .5;
        delta[1] += (0 - delta[1]) * .5;

        gravityBehavior.setAcceleration({ 
          x: gravity.x * 5e-4 + delta[0], 
          y: gravity.y * 5e-4 + delta[1]
        });

        mouseDrag();
        world.step( time );
        // only render if not paused
              if ( !world.isPaused() ){
                  world.render();
              }
      }


      function mouseDrag() {

        // mouse press
        if (isMouseDown && !mouseJoint) {

          var body = getBodyAtMouse();

          if (body) {

            var md = Physics.body('point', {
              x: mouse.x,
              y: mouse.y
            });
            mouseJoint = constraints.distanceConstraint(md, body, 0.2);
          }
        }

        // mouse release
        if (!isMouseDown) {

          if (mouseJoint) {

            constraints.remove( mouseJoint );
            mouseJoint = null;
          }
        }

        // mouse move
        if (mouseJoint) {

          mouseJoint.bodyA.state.pos.set(mouse.x, mouse.y);
        }
      }

      function getBodyAtMouse() {

        return world.findOne({ $at: Physics.vector(mouse.x, mouse.y) });
      }

      function setWalls() {

        worldAABB = Physics.aabb.apply(null, stage);
              edgeBounce.setAABB( worldAABB );

      }

      // .. UTILS

      function getElementsByClass( searchClass ) {

        var classElements = [];
        var els = document.getElementsByTagName('*');
        var elsLen = els.length

        for (i = 0, j = 0; i < elsLen; i++) {

          var classes = els[i].className.split(' ');
          for (k = 0; k < classes.length; k++)
            if ( classes[k] == searchClass )
              classElements[j++] = els[i];
        }

        return classElements;
      }



      function getBrowserDimensions() {

        var changed = false;

        if ( stage[0] != window.screenX ) {

          delta[0] = (window.screenX - stage[0]) * 50;
          stage[0] = window.screenX;
          changed = true;
        }

        if ( stage[1] != window.screenY ) {

          delta[1] = (window.screenY - stage[1]) * 50;
          stage[1] = window.screenY;
          changed = true;
        }

        if ( stage[2] != window.innerWidth ) {

          stage[2] = window.innerWidth;
          changed = true;
        }

        if ( stage[3] != window.innerHeight ) {

          stage[3] = window.innerHeight;
          changed = true;
        }

        return changed;
      }
*/