/*!
 * recastjs-editor
 * https://github.com/vincent/recastjs-editor
 *
 * Copyright 2014 Vincent Lark
 * Released under the MIT license
 */
/*jshint strict: false, onevar: false, indent:4 */
/*global viewport, Recast, Menubar, Sidebar, UI, THREE, TWEEN, Stats */

/*
Menubar.Navmesh = function ( editor ) {

    // event handlers

    function onObject3DOptionClick () {

        var mesh = new THREE.Object3D();
        mesh.name = 'Object3D ' + ( ++ meshCount );

        editor.addObject( mesh );
        editor.select( mesh );

    }

    // configure menu contents

    var createOption = UI.MenubarHelper.createOption;
    var createDivider = UI.MenubarHelper.createDivider;

    var menuConfig = [
        createOption( 'Set flag', onSetFlagOptionClick ),
        createDivider(),

        createOption( 'Plane', onPlaneOptionClick ),
        createOption( 'Box', onBoxOptionClick ),
        createOption( 'Circle', onCircleOptionClick ),
        createOption( 'Cylinder', onCylinderOptionClick ),
        createOption( 'Sphere', onSphereOptionClick  ),
        createOption( 'Icosahedron', onIcosahedronOptionClick ),
        createOption( 'Torus', onTorusOptionClick ),
        createOption( 'Torus Knot', onTorusKnotOptionClick ),
        createDivider(),

        createOption( 'Sprite', onSpriteOptionClick  ),
        createDivider(),

        createOption( 'Point light', onPointLightOptionClick ),
        createOption( 'Spot light', onSpotLightOptionClick ),
        createOption( 'Directional light', onDirectionalLightOptionClick ),
        createOption( 'Hemisphere light', onHemisphereLightOptionClick ),
        createOption( 'Ambient light', onAmbientLightOptionClick )
    ];

    var optionsPanel = UI.MenubarHelper.createOptionsPanel( menuConfig );

    return UI.MenubarHelper.createMenuContainer( 'Navmesh', optionsPanel );

}
*/
