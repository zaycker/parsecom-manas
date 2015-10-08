var jobWorkflow = {
    start: function () {
        return this._operateWithLimitCatch(this.taskDelete.bind(this), this.taskAdd.bind(this));
    },
    taskDelete: function () {
        return Parse.Promise.as('deleted');
    },
    taskAdd: function () {
        var data = this.getData().slice(0, this._leftBatchSize),
            self = this;
        if (!data.length) {
            return Parse.Promise.as('finished');
        }

        return Parse.Promise.when(data.map(function (item) {
            if (!item.promise) {
                item.promise = self._addItem(item);
                item.promise.done(function () {
                    var data = self.getData();
                    data.splice(data.indexOf(item), 1);
                    return Parse.Promise.as('item added');
                }).fail(function () {
                    item.promise = null;
                    return Parse.Promise.error('item add failed');
                });
            }
            return item.promise;
        })).then(this.taskAdd, this.delayAdd.bind(this, 1));
    },
    _addItem: function (item) {
        return Parse.Promise.as('added');
    },

    _operateWithLimitCatch: function (operation, nextOperation) {
        return operation.then(nextOperation, function (error) {
            return error.code === Parse.Error.REQUEST_LIMIT_EXCEEDED ?
                this.delay(delay).done(operation) : Parse.Promise.error(error);
        }.bind(this))
    },

    getData: function () {
        if (!this._data) {
            this._data = this._generateData();
        }
        return this._data;
    }
};
