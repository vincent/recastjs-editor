/*!
 * recastjs-editor
 * https://github.com/vincent/recastjs-editor
 *
 * Copyright 2014 Vincent Lark
 * Released under the MIT license
 */
/*jshint strict: false, onevar: false, indent:4 */
/*global _, Backbone, Recast, viewport, $, Sidebar, UI, THREE, TWEEN, Stats */

var Zone = Backbone.Model.extend({
    defaults: {
        polyMeshes: [],
        polyRefs: [],
        polys: [],
        flags: [],
    },
    initialize: function () {
        this.set('id', parseInt( (Math.random() * 10000) / 1000, 0) );
    },
    addPolygon: function (poly) {
        if ( this.get('polyRefs').indexOf( poly.ref ) === -1 ) {
            this.get('polyRefs').push( poly.ref );
            this.get('polys').push( poly );
        }
    },
    removePolygon: function (poly) {
        if ( this.get('polyRefs').indexOf( poly.ref ) > -1 ) {

            this.set('polyRefs', _.without( this.get('polyRefs'), poly.ref ));
            this.set('polys', _.reject(this.get('polys'), function (aPoly) {
                return aPoly.ref === poly.ref;
            }));
        }
    }
});

var ZoneCollection = Backbone.Collection.extend({
    model: Zone,
    exports: function () {
        var exports = {};
        _.each( this.models, function (zone) {
            var checkedFlags = _.where( document.getElementsByClassName( 'zone-flag-' + zone.id ), { checked: true });
            exports[ zone.get('name') ] = {
                name:  zone.get('name'),
                refs:  zone.get('polyRefs'),
                flags: _.map( checkedFlags, function (el) {
                    return el.flag;
                })
            };
        });

        return exports;
    }
});

Sidebar.NavmeshZone = function ( editor, navmeshManager ) {

    var update = function () {
        editor.render();
    };

    var container = new UI.CollapsiblePanel();

    container.addStatic( new UI.Text().setValue( 'NAVMESH ZONES' ) );
    container.add( new UI.Break() );

    //

    editor.zones = new ZoneCollection();
    editor.currentZone = new Zone();
    editor.zoning = false;

    //

    container.add( new UI.Button( 'Define a new zone' ).setId( 'new-zone' ).setMarginLeft( '7px' ).onClick( function () {

        if ( editor.zoning ) {
            endZoning();
        } else {
            startZoning();
        }
    }));

    //

    container.add( new UI.Button( 'Export zones' ).setId( 'export-zones' ).setMarginLeft( '7px' ).onClick( function () {

        exportZonesCode();
    }));

    //

    function exportZonesCode () {

        var jsonExport = JSON.stringify( editor.zones.exports(), undefined, 4 );

        window.open().document.write(jsonExport);        
    }

    function endZoning () {
        document.getElementById( 'new-zone' ).innerHTML = 'Define a new zone';
        editor.zoning = false;

        container.add( new UI.Break( ) );
        var row   = new UI.Panel();
        row.zone = editor.currentZone;

        var label = new UI.Text ( ).setValue( editor.zones.length + 1 ).setDisabled( true );
        var input = new UI.Input( ).setValue( ).setWidth( '100px' ).setDisabled( false ).onChange( function () {
            row.zone.set('name', input.getValue() );
        });

        row.add( label );
        row.add( input );

        row.add( new UI.Break( ) );

        for (var flagText in editor.flags) {
            row.add( new UI.Text( flagText ).setWidth( '80px' ).setMarginLeft( '20px' ) );
            var checkbox = new UI.Checkbox( flagText === 'Walkable' ).setClass( 'zone-flag-' + editor.currentZone.id ).setWidth( '100px' );
            checkbox.dom.flag = editor.flags[ flagText ];
            row.add( checkbox );
        }

        container.add( row );

        editor.zones.add( editor.currentZone );
        editor.currentZone = new Zone();
    }

    function startZoning () {
        document.getElementById( 'new-zone' ).innerHTML = 'End this zone';
        editor.zoning = true;
    }

    //

    var currentPoly;

    var dummyMaterial = new THREE.MeshBasicMaterial({
        color: 0x0000FF,
        shading: THREE.FlatShading,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.1,
        overdraw: true
    });

    var selectedMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF0000,
        shading: THREE.FlatShading,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3,
        overdraw: true
    });

    document.getElementById('viewport').addEventListener( 'mousemove', function ( event ) {
        
        event.preventDefault();

        var navigationMesh = navmeshManager.navigationMesh();
        var recast = navmeshManager.recast();

        if ( navigationMesh && editor.zoning && (event.shiftKey || event.ctrlKey) ) {
            var intersects = intersectObjects( event, navigationMesh.children );

            if ( intersects && intersects.object ) {

                // removing
                if ( event.ctrlKey ) {

                    intersects.object.material = dummyMaterial;

                // adding
                } else if ( event.shiftKey ) {

                    intersects.object.material = selectedMaterial;
                }

                var geometry = intersects.object.geometry;

                editor.currentZone.get('polyMeshes').push( intersects.object.uuid );

                recast.queryPolygons(
                    geometry.boundingSphere.center.x,
                    geometry.boundingSphere.center.y,
                    geometry.boundingSphere.center.z,
                    geometry.boundingSphere.radius,
                    geometry.boundingSphere.radius,
                    geometry.boundingSphere.radius,
                    1,
                    recast.cb( function ( polygons ) {
                        for (var i = 0; i < polygons.length; i++) {

                            // removing
                            if ( event.ctrlKey ) {

                                editor.currentZone.removePolygon( polygons[i] );

                            // adding
                            } else if ( event.shiftKey ) {

                                editor.currentZone.addPolygon( polygons[i] );
                            }
                        }
                    } )
                );

                update();

            } else {

                if ( currentPoly ) {
                    currentPoly.material = dummyMaterial;
                }
            }
        }   
    });

    //

    var ray = new THREE.Raycaster();
    var projector = new THREE.Projector();
    var pointerVector = new THREE.Vector3();

    function intersectObjects( pointer, objects ) {

        var rect = viewport.dom.getBoundingClientRect();
        var x = (pointer.clientX - rect.left) / rect.width;
        var y = (pointer.clientY - rect.top) / rect.height;
        pointerVector.set( ( x ) * 2 - 1, - ( y ) * 2 + 1, 0.5 );

        projector.unprojectVector( pointerVector, editor.camera );
        ray.set( editor.camera.position, pointerVector.sub( editor.camera.position ).normalize() );

        var intersections = ray.intersectObjects( objects, true );
        return intersections[0] ? intersections[0] : false;
    }

    //
    
    return container;
};