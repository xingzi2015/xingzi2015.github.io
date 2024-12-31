// 初始化图表
const chart = echarts.init(document.getElementById('chart'));

// 初始数据
const kData = [
    [10,20,10,20],
    [20,30,5,35],
    [30,40,30,40],
    [40,50,30,60],
    [50,90,50,100],
    [100,100,80,120],
    [100,100,80,120],
]; // K 线数据，格式 [开盘, 收盘, 最低, 最高]
let now = new Date();
const times = [
    new Date(now.getTime() - 360000).toLocaleTimeString(),
    new Date(now.getTime() - 300000).toLocaleTimeString(),
    new Date(now.getTime() - 240000).toLocaleTimeString(),
    new Date(now.getTime() - 180000).toLocaleTimeString(),
    new Date(now.getTime() - 120000).toLocaleTimeString(),
    new Date(now.getTime() - 60000).toLocaleTimeString(),
    new Date(now.getTime() - 60000).toLocaleTimeString()

]; // 时间戳数组

// 配置选项
const option = {
    animation: true, // 禁用动画以提升性能
    xAxis: {
        type: 'category',
        data: times,
        boundaryGap: true // 保持 K 线贴合坐标轴
    },
    yAxis: {
        type: 'value'
    },
    series: [{
        name: 'K线图',
        type: 'candlestick',
        data: kData
    }]
};

chart.setOption(option);

// 模拟价格数据
function getNewPrice(lastPrice) {
    return lastPrice*(Math.random()*0.2+0.9+0.005); // 随机生成 50 到 150 之间的价格
}

// 当前分钟的临时数据
let currentK = {
    open: 100,
    close: 0,
    low: Infinity,
    high: -Infinity
};
currentK.close=currentK.open;

function updateCurrentK() {
    const price = getNewPrice(currentK.close);

    // 更新当前 K 线数据
    currentK.close = price;
    currentK.low = Math.min(currentK.low, price);
    currentK.high = Math.max(currentK.high, price);

    // 如果已经有数据，更新最后一根 K 线；否则初始化第一根
    if (kData.length > 0) {
        // orgRedGreenFlag =kData[kData.length - 1][0]>kData[kData.length - 1][1]
        // redGreenFlag = currentK.open>currentK.close
        // if(!orgRedGreenFlag && redGreenFlag || !orgRedGreenFlag && redGreenFlag){
        //     kData[kData.length - 1] = [currentK.open, currentK.open, currentK.low, currentK.high];
        //     chart.setOption({
        //         xAxis: { data: times },
        //         series: [{ data: kData }]
        //     });
        // }
        kData[kData.length - 1] = [currentK.open, currentK.close, currentK.low, currentK.high];

    } else {
        kData.push([currentK.open, currentK.close, currentK.low, currentK.high]);
        times.push(new Date().toLocaleTimeString());
    }

    // 更新当前分钟 K 线
    currentK.low = Math.min(currentK.low, currentK.close);
    currentK.high = Math.max(currentK.high, currentK.close);

    // 更新图表
    chart.setOption({
        xAxis: { data: times },
        series: [{ data: kData }]
    });
    document.getElementById('price').innerHTML = currentK.close.toFixed(2)+" 元";
    document.getElementById('percent').innerHTML = ((currentK.close-currentK.open)*100/currentK.open).toFixed(2)+"%";
    document.getElementById('price').style.color = currentK.close>currentK.open?"red":"green";
    document.getElementById('percent').style.color = currentK.close>currentK.open?"red":"green";
    updateTotalProfit();
    checkLiquidation();
}

// 每秒更新当前分钟 K 线
setInterval(updateCurrentK, 500);

// 每分钟生成新 K 线
setInterval(() => {
    if (kData.length > 0) {
        // 固定当前分钟的 K 线
        kData[kData.length - 1] = [currentK.open, currentK.close, currentK.low, currentK.high];
    }

    // 生成新 K 线
    currentK = {
        open: currentK.close,
        close: currentK.close,
        low: Infinity,
        high: -Infinity
    };

    // 追加新时间点和新 K 线
    const newTime = new Date().toLocaleTimeString();
    times.push(newTime);
    kData.push([currentK.open, currentK.close, currentK.low, currentK.high]);

    // 使用 appendData 增加新数据
    chart.appendData({
        seriesIndex: 0,
        data: [[currentK.open, currentK.close, currentK.low, currentK.high]]
    });
}, 10000);


        // 初始本金和杠杆
        const initialCapital = 100000; // 初始本金
        const leverage = 1; // 杠杆倍数
        let capital = initialCapital; // 当前本金
        let totalCost = 0; // 总成本
        let totalShares = 0; // 总股数
        let totalProfit = 0; // 总盈亏


        // 用户持仓记录
        let userRecords = [];

        // 获取元素
        const userRecordList = document.getElementById('user-record');
        const opAmountInput = document.getElementById('op-amount');
        const buyBtn = document.getElementById('buy-btn');
        const sellBtn = document.getElementById('sell-btn');
        const totalProfitDiv = document.getElementById('total-profit');

        // 买入逻辑
        buyBtn.addEventListener('click', () => {
            const amount = parseFloat(opAmountInput.value);
            if (isNaN(amount) || amount <= 0) {
                alert('请输入有效的股数');
                return;
            }
            const costPrice = currentK.close;
            const totalCostForBuy = amount * costPrice;

            // 检查是否超过杠杆限制
            if (totalCostForBuy > capital * leverage) {
                alert('余额不足，无法买入');
                return;
            }

            const record = {
                type: '买入',
                amount: amount,
                costPrice: costPrice,
                sellPrice: null,
                profit: null
            };
            userRecords.push(record);

            // 更新总体持仓数据
            totalCost += totalCostForBuy;
            totalShares += amount;

            updateUserRecordList();
            updateTotalProfit();

            // 检查是否需要平仓
            checkLiquidation();
        });

        // 卖出逻辑
        sellBtn.addEventListener('click', () => {
            const amount = parseFloat(opAmountInput.value);
            if (isNaN(amount) || amount <= 0) {
                alert('请输入有效的股数');
                return;
            }
            if (amount > totalShares) {
                alert('卖出股数不能超过持仓数量');
                return;
            }

            const sellPrice = currentK.close;
            const costPrice = totalCost / totalShares;
            const profit = (sellPrice - costPrice) * amount;

            // 更新总体持仓数据
            totalCost -= amount * costPrice;
            totalShares -= amount;
            totalProfit += profit;

            // 添加卖出记录
            userRecords.push({
                type: '卖出',
                amount: amount,
                costPrice: costPrice,
                sellPrice: sellPrice,
                profit: profit
            });

            updateUserRecordList();
            updateTotalProfit();

            // 检查是否需要平仓
            checkLiquidation();
        });

        // 更新用户记录列表
        function updateUserRecordList() {
            userRecordList.innerHTML = ''; // 清空列表
            userRecords.forEach((record, index) => {
                const li = document.createElement('li');
                let text = `${record.type} - 股数: ${record.amount}, 成本价: ${record.costPrice.toFixed(2)}`;
                if (record.type === '卖出') {
                    text += `, 卖出价: ${record.sellPrice.toFixed(2)}, 盈亏: ${record.profit.toFixed(2)}`;
                }
                li.textContent = text;
                userRecordList.appendChild(li);
            });
        }

        // 更新总体盈亏
        function updateTotalProfit() {
            const currentValue = totalShares * currentK.close; // 当前市值
            totalProfit = currentValue - totalCost; // 总盈亏
            const totalAsset = capital + totalProfit; // 总资产

            // 显示总体盈亏
            totalProfitDiv.innerHTML = `
                总资产: ${totalAsset.toFixed(2)} (盈亏: ${totalProfit.toFixed(2)})
            `;
        }

        // 检查是否需要平仓
        function checkLiquidation() {
            const totalAsset = capital + totalProfit;
            if (totalAsset <= 0) {
                alert('总资产小于 0，触发平仓');
                liquidate();
            }
        }

        // 平仓逻辑
        function liquidate() {
            if (totalShares === 0) return;

            const sellPrice = currentK.close;
            const costPrice = totalCost / totalShares;
            const profit = (sellPrice - costPrice) * totalShares;

            // 添加卖出记录
            userRecords.push({
                type: '卖出',
                amount: totalShares,
                costPrice: costPrice,
                sellPrice: sellPrice,
                profit: profit
            });

            // 更新总体持仓数据
            totalCost = 0;
            totalShares = 0;
            totalProfit += profit;

            updateUserRecordList();
            updateTotalProfit();
        }