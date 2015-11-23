/*!
 * Module dependencies.
 */
var loopback = require('loopback'),
    assert = require('assert'),
    async = require('async'),
    explorer = require('loopback-component-explorer');

var iotmarket = module.exports = createIotMarket;

iotmarket.version = require('../package.json').version;

//Based on the same sequence than loopback-boot.executor
function createIotMarket(config) {

    config = config || {name: 'iotmarket'};

    var app = loopback();
    app.booting = true;

    assertIotMarketVersion(app);

    setHost(app, config);
    setPort(app, config);
    setApiRoot(app, config);

    setupDataSources(app, config);
    setupModels(app, config);
    setupMiddlewares(app, config);
    setupComponents(app, config);    

    app.booting = false;
    finalize(app);
    
    app.booting = false;
    return app;
}

// So far it does nothing
function assertIotMarketVersion(app) {}

function setHost(app, config) {
  var host =
	process.env.npm_config_host ||
	process.env.OPENSHIFT_SLS_IP ||
	process.env.OPENSHIFT_NODEJS_IP ||
	process.env.VCAP_APP_HOST ||
	process.env.HOST ||
	config.host ||
	process.env.npm_package_config_host ||
	app.get('host');
    
    if (host !== undefined) {
	assert(typeof host === 'string', 'app.host must be a string');
	app.set('host', host);
    }
}

function find(array, predicate) {
  return array.filter(predicate)[0];
}

function setPort(app, config) {
    var port = find([
	process.env.npm_config_port,
	process.env.OPENSHIFT_SLS_PORT,
	process.env.OPENSHIFT_NODEJS_PORT,
	process.env.VCAP_APP_PORT,
	process.env.PORT,
	config.port,
	process.env.npm_package_config_port,
	app.get('port'),
	3000
    ], function(p) {
	return p != null;
    });
    
    if (port !== undefined) {
	var portType = typeof port;
	assert(portType === 'string' || portType === 'number',
	       'app.port must be a string or number');
	app.set('port', port);
    }
}

function setApiRoot(app, config) {
    var restApiRoot =
	config.restApiRoot ||
	app.get('restApiRoot') ||
	'/api';
    
    assert(restApiRoot !== undefined, 'app.restBasePath is required');
    assert(typeof restApiRoot === 'string',
	   'app.restApiRoot must be a string');
    assert(/^\//.test(restApiRoot),
	   'app.restApiRoot must start with "/"');
    app.set('restApiRoot', restApiRoot);
}

function setupDataSources(app, config) {
    // We'll be using only two types data sources (one in the memory and one with mongodb)
    assert(typeof config.name === 'string' &&
	  config.name.length, 'config.name should be a non-empty string');
    
    var dbmemory = config.name + '-memory',
        dbmongo = config.name + '-mongo';

    app.set('dbmemory', dbmemory);
    app.set('dbmongo', dbmongo);

    app.dataSource(dbmemory, { connector: 'memory' });
    app.dataSource(dbmongo, {
	connector: 'mongodb', 
	host: 'localhost', 
	port: 27017});
}

function finalize(app) {
    // Disable the legacy explorer
    app.set("legacyExplorer", false);

    // Create a LoopBack context for all requests
    app.use(loopback.context());

    // Expose the models over REST
    app.use(app.get("restApiRoot"), loopback.rest());
}

function setupModels(app, config) {
    /* 
     * An Iot Hub API models includes plugins, enablers, 
     * feeds (atomic, composed and executable), services and applications
     * Each feed actually represents a submodel with the Iot Hub API data model specifications
     * We will also most of the loopback builtin models
     */
    
    var mongo = {dataSource: app.get('dbmongo')},
        db = {dataSource: app.get('dbmemory')};

    // Built-in user model, access token, acl, role mapping, role
    app.model(loopback.User, db);
    app.model(loopback.AccessToken, db);
    app.model(loopback.ACL, db);
    app.model(loopback.RoleMapping, db);
    app.model(loopback.Role, db);

    var feed = loopback.createModel(
	'feed', 
	{
	    'name': String
	}
    );

    app.model(feed, db);
}
    

function setupMiddlewares(app, config) {
    // We could also register the explorer as middleware
    // app.use('/explorer', explorer.routes(app, { basePath: app.get('restApiRoot')}));
}
    
function setupComponents(app, config) {
    // At the moment, we will add the explorer, but in the future we probably need a Iot Hub UI
    explorer(app, { basePath: app.get('restApiRoot'), mountPath: '/explorer'});
}
