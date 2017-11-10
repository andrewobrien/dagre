import _ from 'lodash'
import initOrder from './init-order'
import crossCount from './cross-count'
import sortSubgraph from './sort-subgraph'
import buildLayerGraph from './build-layer-graph'
import addSubgraphConstraints from './add-subgraph-constraints'
import {Graph} from 'ciena-graphlib'
import {buildLayerMatrix, maxRank} from '../util'

function buildLayerGraphs (g, ranks, relationship) {
  return _.map(ranks, function (rank) {
    return buildLayerGraph(g, rank, relationship)
  })
}

function sweepLayerGraphs (layerGraphs, biasRight) {
  var cg = new Graph()
  _.forEach(layerGraphs, function (lg) {
    var root = lg.graph().root
    var sorted = sortSubgraph(lg, root, cg, biasRight)
    _.forEach(sorted.vs, function (v, i) {
      lg.node(v).order = i
    })
    addSubgraphConstraints(lg, cg, sorted.vs)
  })
}

function assignOrder (g, layering) {
  _.forEach(layering, function (layer) {
    _.forEach(layer, function (v, i) {
      g.node(v).order = i
    })
  })
}

/*
 * Applies heuristics to minimize edge crossings in the graph and sets the best
 * order solution as an order attribute on each node.
 *
 * Pre-conditions:
 *
 *    1. Graph must be DAG
 *    2. Graph nodes must be objects with a "rank" attribute
 *    3. Graph edges must have the "weight" attribute
 *
 * Post-conditions:
 *
 *    1. Graph nodes will have an "order" attribute based on the results of the
 *       algorithm.
 */
export default function order (g, crossingMinimisation = true) {
  var mr = maxRank(g)
  var downLayerGraphs = buildLayerGraphs(g, _.range(1, mr + 1), 'inEdges')
  var upLayerGraphs = buildLayerGraphs(g, _.range(mr - 1, -1, -1), 'outEdges')

  var layering = initOrder(g)
  assignOrder(g, layering)

  var bestCC = Number.POSITIVE_INFINITY
  var best
  if (crossingMinimisation) {
    for (var i = 0, lastBest = 0; lastBest < 4; ++i, ++lastBest) {
      sweepLayerGraphs(i % 2 ? downLayerGraphs : upLayerGraphs, i % 4 >= 2)

      layering = buildLayerMatrix(g)
      var cc = crossCount(g, layering)
      if (cc < bestCC) {
        lastBest = 0
        best = _.cloneDeep(layering)
        bestCC = cc
      }
    }
  } else {
    best = _.cloneDeep(buildLayerMatrix(g))
  }

  assignOrder(g, best)
}
