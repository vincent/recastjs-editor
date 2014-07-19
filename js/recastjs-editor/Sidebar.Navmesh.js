/*!
 * recastjs-editor
 * https://github.com/vincent/recastjs-editor
 *
 * Copyright 2014 Vincent Lark
 * Released under the MIT license
 */
/*jshint strict: false, onevar: false, indent:4 */
/*global Recast, viewport, $, Sidebar, UI, THREE, TWEEN, Stats */
Sidebar.Navmesh = function ( editor ) {

    var navigationMesh = null;
    this.recast = Recast;

    var recast = Recast,
        recastParameters = {},
        dummyMaterial = new THREE.MeshBasicMaterial({
            color: 0x0000FF,
            shading: THREE.FlatShading,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.1,
            overdraw: true
        });

    var update = function () {
        editor.render();
    };

    var signals = editor.signals;

    var container = new UI.CollapsiblePanel();

    container.addStatic( new UI.Text().setValue( 'NAVMESH' ) );
    container.add( new UI.Break() );

    // vertices

    var navigationMeshVerticesRow = new UI.Panel();
    var navigationMeshVertices = new UI.Text().setColor( '#444' ).setFontSize( '12px' );

    navigationMeshVerticesRow.add( new UI.Text( 'Vertices' ).setWidth( '90px' ) );
    navigationMeshVerticesRow.add( navigationMeshVertices );

    container.add( navigationMeshVerticesRow );

    // faces

    var navigationMeshFacesRow = new UI.Panel();
    var navigationMeshFaces = new UI.Text().setColor( '#444' ).setFontSize( '12px' );

    navigationMeshFacesRow.add( new UI.Text( 'Faces' ).setWidth( '90px' ) );
    navigationMeshFacesRow.add( navigationMeshFaces );

    container.add( navigationMeshFacesRow );

    // recast parameters

    var navmeshParamsDefaults = {
        cellSize: 0.1,
        cellHeight: 0.05,
        agentHeight: 1.8,
        agentRadius: 0.4,
        agentMaxClimb: 2.0,
        agentMaxSlope: 30.0
    };

    for (var param in navmeshParamsDefaults) {
        var navmeshParamRow = new UI.Panel();
        navmeshParamRow.add( new UI.Text( param ).setWidth( '150px' ) );
        navmeshParamRow.add( new UI.Input().setValue( navmeshParamsDefaults[param] ).setWidth( '50px' ).setColor( '#444' ).setFontSize( '12px' ) );

        recastParameters[ param ] = navmeshParamsDefaults[param];

        container.add( navmeshParamRow );
    }

    var navmeshParamsRenew = new UI.Button( '⟳' ).setMarginLeft( '7px' ).onClick( initNavMesh );

    container.add( navmeshParamsRenew );

    var navmeshToggle = new UI.Button( 'Show navmesh' ).setMarginLeft( '7px' ).onClick( function () {

        navigationMesh.__webglActive = ! navigationMesh.__webglActive;     
    });

    container.add( navmeshToggle );

    // create file input element for scene import

    var fileInput = document.createElement( 'input' );
    fileInput.type = 'file';
    fileInput.addEventListener( 'change', function ( ) {

        var file = fileInput.files[ 0 ];

        var reader = new FileReader();
        reader.addEventListener( 'load', function ( event ) {

            editor.config.setKey( 'navmesh-data', event.target.result );

            recast.OBJDataLoader( event.target.result, function () {

                initNavMesh();
            });

        }, false );
        reader.readAsText( file );
    });

    // if we had a previous navmesh in localStorage, load it

    if ( editor.config.getKey( 'navmesh-data' ) ) {

        setTimeout(function(){
            recast.OBJDataLoader( editor.config.getKey( 'navmesh-data' ), function () {
                initNavMesh();
            });
        }, 500);
    }

    var navmeshImport = new UI.Button( 'Import navmesh' ).setMarginLeft( '7px' ).onClick( function () {

        fileInput.click();
    });

    container.add( navmeshImport );

    //

    container.add( new UI.Break() );
    container.add( new UI.Break() );

    var currentObjectContainer = new UI.Panel();
    currentObjectContainer.setDisplay( 'none' );
    container.add( new UI.Text().setValue( 'CURRENT OBJECT' ) );
    container.add( new UI.Break() );

    // uuid

    var geometryUUIDRow = new UI.Panel();
    var geometryUUID = new UI.Input().setWidth( '115px' ).setColor( '#444' ).setFontSize( '12px' ).setDisabled( true );

    geometryUUIDRow.add( new UI.Text( 'UUID' ).setWidth( '90px' ) );
    geometryUUIDRow.add( geometryUUID );

    currentObjectContainer.add( geometryUUIDRow );

    // name

    var geometryNameRow = new UI.Panel();
    var geometryName = new UI.Input().setWidth( '150px' ).setColor( '#444' ).setFontSize( '12px' ).onChange( function () {

        editor.setGeometryName( editor.selected.geometry, geometryName.getValue() );
    });

    geometryNameRow.add( new UI.Text( 'Name' ).setWidth( '90px' ) );
    geometryNameRow.add( geometryName );

    currentObjectContainer.add( geometryNameRow );

    // flags

    var geometryFlagsRow = new UI.Panel();
    geometryFlagsRow.add( new UI.Text( 'Flags' ) );
    geometryFlagsRow.add( new UI.Break() );
    geometryFlagsRow.add( new UI.Break() );

    editor.flags = {
        'Walkable':  recast.FLAG_WALK,
        // 'Swimable':  recast.FLAG_SWIM,
        // 'Door':      recast.FLAG_DOOR,
        // 'Jump':      recast.FLAG_JUMP,
        'Disabled':  recast.FLAG_DISABLED,
        // 'All flags': recast.FLAG_ALL
    };

    for (var flagText in editor.flags) {

        var geometryFlagRow = new UI.Panel();
        var geometryFlag = new UI.Text( flagText ).setClass( 'navmesh-flag' ).setWidth( '80px' ).setMarginLeft( '20px' ).onChange( updateFlags );
        var geometryFlagEnabled = new UI.Checkbox( flagText === 'Walkable' ).onChange( updateFlags );

        geometryFlagRow.add( geometryFlag );
        geometryFlagRow.add( geometryFlagEnabled );
        geometryFlagsRow.add( geometryFlagRow );        
    }

    currentObjectContainer.add( geometryFlagsRow );


    container.add( currentObjectContainer );

    //

    function cleanup () {
        
        if ( navigationMesh && navigationMesh.parent ) {
            navigationMesh.parent.remove( navigationMesh );
        }
    }

    //

    function initNavMesh () {

        cleanup();

        recast.settings( recastParameters );

        /**
         * Get navmesh geometry and draw it
         */
        recast.getNavMeshVertices( recast.cb( function ( vertices ) {

            navigationMesh = createMeshFromVertices( vertices, true );
            navigationMesh.name = 'NavigationMesh';

            // editor.addObject( navigationMesh );
            editor.scene.add( navigationMesh );

            navigationMeshVertices.setValue( vertices.length );
            navigationMeshFaces.setValue( vertices.length / 3 );

            update();
        } ));
        
    }

    //

    function updateFlags ( event ) {
        
        var object = editor.selected;

        if ( object && object.geometry ) {

            var flags = $('#sidebar .navmesh-flag');
        }

    }

    //

    function build () {

        var object = editor.selected;

        if ( object && object.geometry && object.hasParentNamed('NavigationMesh') ) {


        } else {

            currentObjectContainer.setDisplay( 'block' );

        }

    }

    signals.objectSelected.add( build );
    signals.objectChanged.add( build );

    //

    function createMeshFromVertices (vertices) {

        var parent = new THREE.Object3D();

        var materials = [ dummyMaterial ];

        for (var i = 0; i < vertices.length; i++) {
            if (!vertices[i+2]) { break; }

            var geometry = new THREE.ConvexGeometry([
                new THREE.Vector3(   vertices[i].x,   vertices[i].y,   vertices[i].z ), 
                new THREE.Vector3( vertices[i+1].x, vertices[i+1].y, vertices[i+1].z ),
                new THREE.Vector3( vertices[i+2].x, vertices[i+2].y, vertices[i+2].z )
            ]);

            var child = THREE.SceneUtils.createMultiMaterialObject(geometry, materials);
            parent.add(child);

            i += 2;
        }

        return parent;
    }

    container.navigationMesh = function () {
        return navigationMesh;
    };

    container.recast = function () {
        return recast;
    };

    return container;
};

THREE.Mesh.prototype.hasParentNamed = function ( name ) {
    var obj = this;
    while ( obj ) {
        if ( obj.name.indexOf(name) > -1 ) {
            return true;
        }
        obj = obj.parent;
    }
};
