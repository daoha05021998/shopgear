module.exports = function Cart(oldCart) {
    this.items = oldCart.items || {};
    this.totalQty = oldCart.totalQty || parseInt(0);
    this.totalPrice = oldCart.totalPrice || 0;

    this.add = (item, id) => {
        let storeItem = this.items[id];
        if (!storeItem) {
            storeItem = this.items[id] = {
                item: item,
                qty: 0,
                price: 0,
                sale : 0
            };
        }
        storeItem.qty++;
        storeItem.price = parseFloat(Math.floor(storeItem.item.price/10000 - (storeItem.item.price/10000 * storeItem.item.sale / 100)) * 10000 * storeItem.qty);
        this.totalQty++;
        this.totalPrice += parseFloat(Math.floor(storeItem.item.price/10000 - (storeItem.item.price/10000 * storeItem.item.sale / 100)) * 10000);
    };

    this.addItem = function (id) {
        this.items[id].qty++;
        this.items[id].price += parseInt(Math.floor(this.items[id].item.price/10000 - (this.items[id].item.price/10000 * this.items[id].item.sale / 100)) * 10000);
        
        this.totalQty++;
        this.totalPrice += parseInt(Math.floor(this.items[id].item.price/10000 - (this.items[id].item.price/10000 * this.items[id].item.sale / 100)) * 10000);
    };

    this.reduceByOne = function (id) {
        this.items[id].qty--;
        this.items[id].price -= Math.floor(this.items[id].item.price/10000 - (this.items[id].item.price/10000 * this.items[id].item.sale / 100)) * 10000;
        this.totalQty--;
        this.totalPrice -= Math.floor(this.items[id].item.price/10000 - (this.items[id].item.price/10000 * this.items[id].item.sale / 100)) * 10000;

        if (this.items[id].qty <= 0) {
            delete this.items[id];
        }
    };

    this.removeItem = function (id) {
        this.totalQty -= this.items[id].qty;
        this.totalPrice -= this.items[id].price;
        delete this.items[id];
    };

    this.generateArray = () => {
        let arr = [];
        for (let id in this.items) {
            arr.push(this.items[id]);
        }
        return arr;
    }
};