dc.stackableChart = function(_chart) {
    var MIN_DATA_POINT_HEIGHT = 0;
    var DATA_POINT_PADDING_BOTTOM = 1;

    var _groupStack = [];
    var _valueRetrieverStack = [];
    var _dataPointMatrix = [];

    _chart.stack = function(_) {
        if (!arguments.length) {
            var stack = [];
            for (var i = 0; i < _groupStack.length; i++) {
                stack.push([_groupStack[i], _valueRetrieverStack[i]]);
            }
            return stack;
        } else {
            for (var i = 0; i < _.length; ++i) {
                if (Array.isArray(_[i])) {
                    _groupStack[i] = _[i][0];
                    _valueRetrieverStack[i] = _[i][1];
                } else {
                    _groupStack[i] = _[i];
                    _valueRetrieverStack[i] = _chart.valueRetriever();
                }
            }
            return _chart;
        }
    };

    _chart.allGroups = function() {
        var allGroups = [];

        allGroups.push(_chart.group());

        for (var i = 0; i < _groupStack.length; ++i)
            allGroups.push(_groupStack[i]);

        return allGroups;
    };

    _chart.allValueRetrievers = function() {
        var allRetrievers = [];

        allRetrievers.push(_chart.valueRetriever());

        for (var i = 0; i < _valueRetrieverStack.length; ++i)
            allRetrievers.push(_valueRetrieverStack[i]);

        return allRetrievers;
    };

    _chart.stackedValueRetriever = function(groupIndex){
        return _chart.allValueRetrievers()[groupIndex];
    };

    _chart.yAxisMin = function() {
        var min = 0;
        var allGroups = _chart.allGroups();

        for (var groupIndex = 0; groupIndex < allGroups.length; ++groupIndex) {
            var group = allGroups[groupIndex];
            var m = d3.min(group.all(), function(e) {
                return _chart.stackedValueRetriever(groupIndex)(e);
            });
            if (m < min) min = m;
        }

        return min;
    };

    _chart.yAxisMax = function() {
        var max = 0;
        var allGroups = _chart.allGroups();

        for (var groupIndex = 0; groupIndex < allGroups.length; ++groupIndex) {
            var group = allGroups[groupIndex];
            max += d3.max(group.all(), function(e) {
                return _chart.stackedValueRetriever(groupIndex)(e);
            });
        }

        return max;
    };

    _chart.dataPointBaseline = function() {
        return _chart.margins().top + _chart.yAxisHeight() - DATA_POINT_PADDING_BOTTOM;
    };

    _chart.dataPointHeight = function(d, groupIndex) {
        var h = (_chart.yAxisHeight() - _chart.y()(_chart.stackedValueRetriever(groupIndex)(d)) - DATA_POINT_PADDING_BOTTOM);
        if (isNaN(h) || h < MIN_DATA_POINT_HEIGHT)
            h = MIN_DATA_POINT_HEIGHT;
        return h;
    };

    _chart.calculateDataPointMatrix = function(groups) {
        for (var groupIndex = 0; groupIndex < groups.length; ++groupIndex) {
            var data = groups[groupIndex].all();
            _dataPointMatrix[groupIndex] = [];
            for (var dataIndex = 0; dataIndex < data.length; ++dataIndex) {
                var d = data[dataIndex];
                if (groupIndex == 0)
                    _dataPointMatrix[groupIndex][dataIndex] = _chart.dataPointBaseline() - _chart.dataPointHeight(d, groupIndex);
                else
                    _dataPointMatrix[groupIndex][dataIndex] = _dataPointMatrix[groupIndex - 1][dataIndex] - _chart.dataPointHeight(d, groupIndex);
            }
        }
    };

    _chart.dataPointMatrix = function(_) {
        if (!arguments.length) return _dataPointMatrix;
        _dataPointMatrix = _;
        return _chart;
    };

    return _chart;
};

dc.stackableChart.ChartStack = function(){
    var _dataPointMatrix = [];

    this.setDataPoint = function(x, y, data){
        if(!_dataPointMatrix[x])
            _dataPointMatrix[x] = [];

        _dataPointMatrix[x][y] = data;
    };

    this.getDataPoint = function(x, y){
        return _dataPointMatrix[x][y];
    };
};