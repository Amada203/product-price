import * as echarts from 'echarts';

/**
 * 图表工具类
 * 提供创建各种图表的方法
 */
const chartUtils = {
  /**
   * 创建价格走势图
   * @param {string} elementId - 图表容器ID
   * @param {Array} priceData - 价格数据
   * @param {Array} predictionData - 预测数据
   * @param {number} probabilityThreshold - 概率阈值
   * @param {Object} organizedPriceData - 组织后的价格数据
   * @returns {echarts.ECharts} 图表实例
   */
  createPriceChart(elementId, priceData, predictionData, probabilityThreshold, organizedPriceData = null) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return null;
    
    const myChart = echarts.init(chartDom);
    
    // 准备数据
    const dates = priceData.map(item => item.date);
    const prices = priceData.map(item => item.price);
    const changeLabels = priceData.map(item => item.changeLabel);
    
    // 找出预测日期
    const predictionDates = [...new Set(predictionData.map(item => item.target_date))];
    
    // 计算横坐标的最大日期（预测日期的前一天）
    let maxDate = new Date();
    if (predictionDates.length > 0) {
      const firstPredictionDate = new Date(Math.min(...predictionDates.map(d => new Date(d))));
      maxDate = new Date(firstPredictionDate);
      maxDate.setDate(maxDate.getDate() - 1);
    }
    
    // 过滤价格数据，只显示到预测日期前一天
    const filteredPriceData = priceData.filter(item => new Date(item.date) <= maxDate);
    const filteredDates = filteredPriceData.map(item => item.date);
    const filteredPrices = filteredPriceData.map(item => item.price);
    const filteredChangeLabels = filteredPriceData.map(item => item.changeLabel);
    
    // 分离近90天和去年同期数据
    const ninetyDaysAgo = new Date(maxDate);
    ninetyDaysAgo.setDate(maxDate.getDate() - 90);
    
    const lastYearStart = new Date(maxDate);
    lastYearStart.setFullYear(maxDate.getFullYear() - 1);
    lastYearStart.setDate(maxDate.getDate() - 30);
    
    const lastYearEnd = new Date(maxDate);
    lastYearEnd.setFullYear(maxDate.getFullYear() - 1);
    
    const recentData = [];
    const lastYearData = [];
    
    filteredPriceData.forEach(item => {
      const itemDate = new Date(item.date);
      if (itemDate >= ninetyDaysAgo && itemDate <= maxDate) {
        recentData.push({
          date: item.date,
          price: item.price,
          changeLabel: item.changeLabel
        });
      } else if (itemDate >= lastYearStart && itemDate <= lastYearEnd) {
        lastYearData.push({
          date: item.date,
          price: item.price,
          changeLabel: item.changeLabel
        });
      }
    });
    
    // 准备不同数据集的日期和价格
    const recentDates = recentData.map(item => item.date);
    const recentPrices = recentData.map(item => item.price);
    const lastYearDates = lastYearData.map(item => item.date);
    const lastYearPrices = lastYearData.map(item => item.price);
    
    // 标记区域数据
    const markAreaData = [];
    let inChangeArea = false;
    let startIndex = -1;
    
    // 查找价格变动区域
    for (let i = 0; i < changeLabels.length; i++) {
      if (changeLabels[i] && !inChangeArea) {
        inChangeArea = true;
        startIndex = i;
      } else if (!changeLabels[i] && inChangeArea) {
        inChangeArea = false;
        markAreaData.push([
          { xAxis: dates[startIndex] },
          { xAxis: dates[i - 1] }
        ]);
      }
    }
    
    // 如果最后一个区域还在变动中
    if (inChangeArea) {
      markAreaData.push([
        { xAxis: dates[startIndex] },
        { xAxis: dates[dates.length - 1] }
      ]);
    }
    
    // 预测点数据
    const predictionPoints = [];
    
    predictionData.forEach(prediction => {
      if (dates.includes(prediction.target_date)) {
        const dateIndex = dates.indexOf(prediction.target_date);
        const price = prices[dateIndex];
        
        // 根据预测概率确定颜色
        const willChange = prediction.prediction_probability > probabilityThreshold;
        
        predictionPoints.push({
          name: `${prediction.prediction_date} 预测 ${prediction.target_date}`,
          value: [prediction.target_date, price],
          itemStyle: {
            color: willChange ? '#ff4d4f' : '#52c41a'
          },
          label: {
            show: true,
            formatter: `${(prediction.prediction_probability * 100).toFixed(0)}%`,
            position: 'top',
            fontSize: 12,
            color: willChange ? '#ff4d4f' : '#52c41a'
          }
        });
      }
    });
    
    // 图表配置
    const option = {
      title: {
        text: '商品价格走势',
        left: 'center',
        textStyle: {
          fontWeight: 'normal',
          fontSize: 16,
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        },
        formatter: function(params) {
          const date = params[0].axisValue;
          const price = params[0].data;
          
          let result = `<div style="font-weight:bold;margin-bottom:5px;">${date}</div>`;
          result += `<div>价格: ¥${price}</div>`;
          
          // 查找该日期的预测数据
          const predictions = predictionData.filter(p => p.target_date === date);
          if (predictions.length > 0) {
            result += `<div style="margin-top:5px;font-weight:bold;">预测信息:</div>`;
            predictions.forEach(p => {
              const willChange = p.prediction_probability > probabilityThreshold;
              result += `<div style="color:${willChange ? '#ff4d4f' : '#52c41a'}">
                预测日期: ${p.prediction_date}<br/>
                预测概率: ${(p.prediction_probability * 100).toFixed(2)}%<br/>
                预测结果: ${willChange ? '价格变动' : '价格稳定'}
              </div>`;
            });
          }
          
          return result;
        }
      },
      legend: {
        data: ['近90天价格', '去年同期价格', '预测点'],
        bottom: 0,
        selected: {
          '近90天价格': true,
          '去年同期价格': false, // 默认不显示去年同期数据
          '预测点': true
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLabel: {
          formatter: function(value) {
            // 简化日期显示
            return value.substring(5); // 只显示月-日
          },
          interval: Math.ceil(dates.length / 15), // 控制显示密度
          rotate: 45 // 旋转标签
        },
        splitLine: {
          show: false
        },
        axisLine: {
          lineStyle: {
            color: '#666'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '价格 (¥)',
        nameTextStyle: {
          color: '#666'
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#ddd'
          }
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#666'
          }
        }
      },
      series: [
        {
          name: '近90天价格',
          type: 'line',
          sampling: 'average',
          data: recentData.map(item => [item.date, item.price]),
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 3,
            color: '#1890ff'
          },
          areaStyle: {
            opacity: 0.2,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(24,144,255,0.3)' },
              { offset: 1, color: 'rgba(24,144,255,0.1)' }
            ])
          },
          markArea: {
            itemStyle: {
              color: 'rgba(255, 173, 177, 0.2)'
            },
            data: markAreaData
          }
        },
        {
          name: '去年同期价格',
          type: 'line',
          sampling: 'average',
          data: lastYearData.map(item => [item.date, item.price]),
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 2,
            color: '#722ed1',
            type: 'dashed'
          }
        },
        {
          name: '预测点',
          type: 'scatter',
          data: predictionPoints,
          symbolSize: 10,
          z: 10
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          start: Math.max(0, 100 - (2000 / dates.length)),
          end: 100
        },
        {
          start: Math.max(0, 100 - (2000 / dates.length)),
          end: 100
        }
      ],
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: 'none'
          },
          saveAsImage: {}
        },
        right: 20
      }
    };
    
    myChart.setOption(option);
            '预测点': true
          }
        }
      };
      myChart.setOption(newOption);
    };
    
    buttonContainer.appendChild(recentButton);
    buttonContainer.appendChild(lastYearButton);
    buttonContainer.appendChild(bothButton);
    
    // 将按钮添加到图表下方
    chartDom.parentNode.insertBefore(buttonContainer, chartDom.nextSibling);
    
    // 响应窗口大小变化
    window.addEventListener('resize', () => {
      myChart.resize();
    });
    
    return myChart;
  },
  
  /**
   * 创建预测vs真实对比图
   * @param {string} elementId - 图表容器ID
   * @param {Array} comparisonData - 对比数据
   * @returns {echarts.ECharts} 图表实例
   */
  createComparisonChart(elementId, comparisonData) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return null;
    
    const myChart = echarts.init(chartDom);
    
    // 按日期排序
    comparisonData.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 准备数据
    const dates = comparisonData.map(item => item.date);
    const predictedData = comparisonData.map(item => item.predicted ? 1 : 0);
    const actualData = comparisonData.map(item => item.actual ? 1 : 0);
    const probabilities = comparisonData.map(item => item.predictionProbability);
    
    // 计算准确率
    const accuracy = comparisonData.filter(item => item.isCorrect).length / comparisonData.length;
    
    // 图表配置
    const option = {
      title: {
        text: `预测vs真实对比 (准确率: ${(accuracy * 100).toFixed(2)}%)`,
        left: 'center',
        textStyle: {
          fontWeight: 'normal',
          fontSize: 16,
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          const date = params[0].axisValue;
          const item = comparisonData.find(d => d.date === date);
          
          if (!item) return '';
          
          return `
            <div style="font-weight:bold;margin-bottom:5px;">${date}</div>
            <div>预测: ${item.predicted ? '变动' : '不变'}</div>
            <div>实际: ${item.actual ? '变动' : '不变'}</div>
            <div>预测概率: ${(item.predictionProbability * 100).toFixed(2)}%</div>
            <div>实际变动百分比: ${(item.actualChangePercentage * 100).toFixed(2)}%</div>
            <div style="color:${item.isCorrect ? '#52c41a' : '#ff4d4f'}">
              结果: ${item.isCorrect ? '预测正确' : '预测错误'}
            </div>
          `;
        }
      },
      legend: {
        data: ['预测变动', '实际变动', '预测概率'],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          formatter: function(value) {
            // 简化日期显示
            return value.substring(5); // 只显示月-日
          },
          interval: 0, // 显示所有标签
          rotate: 45 // 旋转标签
        },
        splitLine: {
          show: false
        },
        axisLine: {
          lineStyle: {
            color: '#666'
          }
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '变动状态',
          min: 0,
          max: 1,
          interval: 1,
          axisLabel: {
            formatter: function(value) {
              return value === 1 ? '是' : '否';
            }
          },
          splitLine: {
            lineStyle: {
              type: 'dashed',
              color: '#ddd'
            }
          }
        },
        {
          type: 'value',
          name: '预测概率',
          min: 0,
          max: 1,
          position: 'right',
          axisLine: {
            lineStyle: {
              color: '#91cc75'
            }
          },
          axisLabel: {
            formatter: function(value) {
              return (value * 100).toFixed(0) + '%';
            }
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: '预测变动',
          type: 'line',
          step: 'middle',
          itemStyle: {
            color: '#5470c6'
          },
          symbolSize: 8,
          data: predictedData,
          lineStyle: {
            width: 3
          },
          label: {
            show: true,
            position: 'top',
            formatter: function(params) {
              return params.value === 1 ? '变动' : '不变';
            }
          }
        },
        {
          name: '实际变动',
          type: 'line',
          step: 'middle',
          itemStyle: {
            color: '#91cc75'
          },
          symbolSize: 8,
          data: actualData,
          lineStyle: {
            width: 3
          },
          label: {
            show: true,
            position: 'bottom',
            formatter: function(params) {
              return params.value === 1 ? '变动' : '不变';
            }
          }
        },
        {
          name: '预测概率',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: '#fac858'
          },
          data: probabilities
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          start: 0,
          end: 100
        }
      ],
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: 'none'
          },
          saveAsImage: {}
        },
        right: 20
      }
    };
    
    myChart.setOption(option);
    
    // 响应窗口大小变化
    window.addEventListener('resize', () => {
      myChart.resize();
    });
    
    return myChart;
  },
  
  /**
   * 创建每日预测图表 - 时间序列线图
   * @param {string} elementId - 图表容器ID
   * @param {Array} dailyPredictions - 每日预测数据
   * @param {number} probabilityThreshold - 概率阈值
   * @returns {echarts.ECharts} 图表实例
   */
  createDailyPredictionChart(elementId, dailyPredictions, probabilityThreshold) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return null;
    
    const myChart = echarts.init(chartDom);
    
    // 准备数据 - 按日期排序
    dailyPredictions.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const dates = dailyPredictions.map(item => item.date);
    const probabilities = dailyPredictions.map(item => item.latestPrediction.prediction_probability);
    
    // 为每个日期创建预测结果标签
    const predictionLabels = probabilities.map(prob => prob > probabilityThreshold ? '预测变动' : '预测不变');
    
    // 图表配置 - 时间序列线图
    const option = {
      title: {
        text: '预测时间段内每日预测概率',
        left: 'center',
        textStyle: {
          fontWeight: 'normal',
          fontSize: 16,
          color: '#333'
        },
        subtext: '按时间序列展示预测出的该商品每日变化概率'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        },
        formatter: function(params) {
          const date = params[0].name;
          const probability = params[0].value;
          const willChange = probability > probabilityThreshold;
          
          return `
            <div style="font-weight:bold;margin-bottom:5px;">${date}</div>
            <div>预测概率: ${(probability * 100).toFixed(2)}%</div>
            <div style="color:${willChange ? '#ff4d4f' : '#52c41a'}">
              预测结果: ${willChange ? '价格变动' : '价格稳定'}
            </div>
          `;
        }
      },
      legend: {
        data: ['预测概率', '阈值线'],
        bottom: 0
      },
      grid: {
        top: '15%',
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          formatter: function(value) {
            // 简化日期显示
            return value.substring(5); // 只显示月-日
          },
          interval: 0, // 显示所有标签
          rotate: 45 // 旋转标签
        },
        splitLine: {
          show: false
        },
        axisLine: {
          lineStyle: {
            color: '#666'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '预测概率',
        min: 0,
        max: 1,
        axisLabel: {
          formatter: function(value) {
            return (value * 100).toFixed(0) + '%';
          }
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#ddd'
          }
        }
      },
      series: [
        {
          name: '预测概率',
          type: 'line',
          data: probabilities.map((prob, index) => {
            const willChange = prob > probabilityThreshold;
            return {
              value: prob,
              itemStyle: {
                color: willChange ? '#ff4d4f' : '#52c41a'
              },
              label: {
                show: true,
                position: 'top',
                formatter: function(params) {
                  return `${(params.value * 100).toFixed(0)}%`;
                },
                fontSize: 12,
                color: willChange ? '#ff4d4f' : '#52c41a'
              }
            };
          }),
          smooth: true,
          symbolSize: 8,
          lineStyle: {
            width: 3,
            color: new echarts.graphic.LinearGradient(0, 1, 0, 0, [
              { offset: 0, color: '#52c41a' },
              { offset: probabilityThreshold, color: '#52c41a' },
              { offset: probabilityThreshold, color: '#ff4d4f' },
              { offset: 1, color: '#ff4d4f' }
            ])
          },
          areaStyle: {
            opacity: 0.2,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(255,77,79,0.3)' },
              { offset: 1, color: 'rgba(82,196,26,0.1)' }
            ])
          },
          markLine: {
            silent: true,
            lineStyle: {
              color: '#faad14',
              type: 'dashed',
              width: 2
            },
            data: [
              {
                yAxis: probabilityThreshold,
                label: {
                  formatter: `阈值: ${(probabilityThreshold * 100).toFixed(0)}%`,
                  position: 'start'
                }
              }
            ]
          }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          start: 0,
          end: 100
        }
      ],
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: 'none'
          },
          saveAsImage: {}
        },
        right: 20
      }
    };
    
    myChart.setOption(option);
    
    // 响应窗口大小变化
    window.addEventListener('resize', () => {
      myChart.resize();
    });
    
    return myChart;
  },

  /**
   * 创建准确率图表
   * @param {HTMLElement} container - 图表容器
   * @param {Array} data - 准确率数据
   * @returns {Object} ECharts实例
   */
  createAccuracyChart(container, data) {
    const chart = echarts.init(container);
    
    const option = {
      title: {
        text: '各商品预测准确率',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          const param = params[0];
          return `${param.name}: ${(param.value * 100).toFixed(2)}%`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(item => item.skuId),
        axisLabel: {
          rotate: 45,
          fontSize: 12
        },
        name: '商品ID',
        nameLocation: 'middle',
        nameGap: 50
      },
      yAxis: {
        type: 'value',
        name: '准确率',
        min: 0,
        max: 1,
        axisLabel: {
          formatter: function(value) {
            return (value * 100).toFixed(0) + '%';
          }
        }
      },
      series: [
        {
          name: '准确率',
          type: 'bar',
          data: data.map(item => item.accuracy),
          itemStyle: {
            color: function(params) {
              // 根据准确率设置颜色
              const value = params.value;
              if (value === null || value === undefined) return '#d9d9d9';
              if (value >= 0.8) return '#52c41a';
              if (value >= 0.6) return '#faad14';
              return '#ff4d4f';
            }
          },
          label: {
            show: true,
            position: 'top',
            formatter: function(params) {
              if (params.value === null || params.value === undefined) {
                return '无数据';
              }
              return (params.value * 100).toFixed(1) + '%';
            },
            fontSize: 10
          },
          barWidth: '60%'
        }
      ]
    };
    
    chart.setOption(option);
    
    // 响应窗口大小变化
    const resizeHandler = () => {
      chart.resize();
    };
    window.addEventListener('resize', resizeHandler);
    
    // 返回图表实例和清理函数
    chart.dispose = function() {
      window.removeEventListener('resize', resizeHandler);
      echarts.dispose(container);
    };
    
    return chart;
  },

  /**
   * 创建预测标签vs真实标签对比曲线图（包含预测概率）
   * @param {string} elementId - 图表容器ID
   * @param {Array} comparisonData - 对比数据
   * @returns {echarts.ECharts} 图表实例
   */
  createPredictionLabelComparisonChart(elementId, comparisonData) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return null;
    
    const myChart = echarts.init(chartDom);
    
    // 按日期排序
    comparisonData.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 准备数据
    // 准备数据
    const dates = comparisonData.map(item => item.date);
    const predictedLabels = comparisonData.map(item => item.predicted ? 1 : 0);
    const actualLabels = comparisonData.map(item => item.actual !== null ? (item.actual ? 1 : 0) : null);
    const predictionProbabilities = comparisonData.map(item => item.predictionProbability * 100); // 转换为百分比
    
    // 计算准确率
    const validComparisons = comparisonData.filter(item => item.actual !== null);
    const accuracy = validComparisons.length > 0 
      ? validComparisons.filter(item => item.isCorrect).length / validComparisons.length 
      : 0;
    
    // 图表配置
    const option = {
      title: {
        text: `预测标签 vs 真实标签对比曲线 (准确率: ${(accuracy * 100).toFixed(2)}%)`,
        left: 'center',
        textStyle: {
          fontWeight: 'normal',
          fontSize: 16,
          color: '#333'
        },
        subtext: '1=变动, 0=不变'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: function(params) {
          const date = params[0].axisValue;
          const item = comparisonData.find(d => d.date === date);
          
          if (!item) return '';
          
          return `
            <div style="font-weight:bold;margin-bottom:5px;">${date}</div>
            <div style="color:#5470c6;">预测标签: ${item.predicted ? '变动(1)' : '不变(0)'}</div>
            <div style="color:#91cc75;">真实标签: ${item.actual !== null ? (item.actual ? '变动(1)' : '不变(0)') : '暂无数据'}</div>
            <div>预测概率: ${(item.predictionProbability * 100).toFixed(2)}%</div>
            ${item.actualChangePercentage !== null ? `<div>实际变动幅度: ${(item.actualChangePercentage * 100).toFixed(2)}%</div>` : ''}
            <div style="color:${item.isCorrect ? '#52c41a' : '#ff4d4f'}">
              ${item.isCorrect !== null ? (item.isCorrect ? '✓ 预测正确' : '✗ 预测错误') : '待验证'}
            </div>
          `;
        }
      },
      legend: {
        data: ['预测标签', '真实标签'],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          formatter: function(value) {
            return value.substring(5); // 只显示月-日
          },
          interval: 0,
          rotate: 45
        },
        splitLine: {
          show: false
        },
        axisLine: {
          lineStyle: {
            color: '#666'
          }
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '标签值',
          min: -0.1,
          max: 1.1,
          interval: 0.5,
          axisLabel: {
            formatter: function(value) {
              if (value === 0) return '不变(0)';
              if (value === 1) return '变动(1)';
              return value.toFixed(1);
            }
          },
          splitLine: {
            lineStyle: {
              type: 'dashed',
              color: '#ddd'
            }
          }
        },
        {
          type: 'value',
          name: '预测概率(%)',
          min: 0,
          max: 100,
          position: 'right',
          axisLabel: {
            formatter: '{value}%'
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: '预测标签',
          type: 'line',
          data: predictedLabels,
          smooth: false,
          step: 'middle',
          symbolSize: 8,
          itemStyle: {
            color: '#5470c6'
          },
          lineStyle: {
            width: 3,
            color: '#5470c6'
          },
          label: {
            show: true,
            position: 'top',
            formatter: function(params) {
              return params.value === 1 ? '变动' : '不变';
            },
            fontSize: 10,
            color: '#5470c6'
          }
        },
        {
          name: '真实标签',
          type: 'line',
          data: actualLabels,
          smooth: false,
          step: 'middle',
          symbolSize: 8,
          itemStyle: {
            color: '#91cc75'
          },
          lineStyle: {
            width: 3,
            color: '#91cc75'
          },
          label: {
            show: true,
            position: 'bottom',
            formatter: function(params) {
              if (params.value === null) return '无数据';
              return params.value === 1 ? '变动' : '不变';
            },
            fontSize: 10,
            color: '#91cc75'
          },
          connectNulls: false // 不连接空值
        },
        {
          name: '预测概率',
          type: 'line',
          yAxisIndex: 1,
          data: predictionProbabilities,
          smooth: true,
          symbolSize: 6,
          itemStyle: {
            color: '#faad14'
          },
          lineStyle: {
            width: 2,
            color: '#faad14',
            type: 'dashed'
          },
          label: {
            show: false
          }
        }
      ],
      // 添加准确性标记
      graphic: comparisonData.map((item, index) => {
        if (item.isCorrect === null) return null;
        
        return {
          type: 'circle',
          shape: {
            cx: 0,
            cy: 0,
            r: 3
          },
          style: {
            fill: item.isCorrect ? '#52c41a' : '#ff4d4f',
            opacity: 0.8
          },
          position: [
            // 计算x位置 (基于索引)
            chartDom.offsetWidth * (index + 0.5) / dates.length,
            // 计算y位置 (在预测和真实标签之间)
            chartDom.offsetHeight * 0.5
          ],
          z: 100
        };
      }).filter(item => item !== null),
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          start: 0,
          end: 100
        }
      ],
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: 'none'
          },
          saveAsImage: {}
        },
        right: 20
      }
    };
    
    myChart.setOption(option);
    
    // 响应窗口大小变化
    window.addEventListener('resize', () => {
      myChart.resize();
    });
    
    return myChart;
  },

  /**
   * 创建热力图 - 显示预测准确率的时间分布
   * @param {string} elementId - 图表容器ID
   * @param {Array} heatmapData - 热力图数据 [{date, hour, accuracy}]
   * @returns {echarts.ECharts} 图表实例
   */
  createAccuracyHeatmap(elementId, heatmapData) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return null;
    
    const myChart = echarts.init(chartDom);
    
    // 准备数据
    const dates = [...new Set(heatmapData.map(item => item.date))].sort();
    const hours = Array.from({length: 24}, (_, i) => i);
    
    // 转换数据格式为 [x, y, value]
    const data = heatmapData.map(item => [
      dates.indexOf(item.date),
      item.hour,
      item.accuracy
    ]);
    
    const option = {
      title: {
        text: '预测准确率时间热力图',
        left: 'center',
        textStyle: {
          fontSize: 16,
          color: '#333'
        }
      },
      tooltip: {
        position: 'top',
        formatter: function(params) {
          const date = dates[params.value[0]];
          const hour = params.value[1];
          const accuracy = params.value[2];
          return `${date} ${hour}:00<br/>准确率: ${(accuracy * 100).toFixed(2)}%`;
        }
      },
      grid: {
        height: '50%',
        top: '10%'
      },
      xAxis: {
        type: 'category',
        data: dates,
        splitArea: {
          show: true
        },
        axisLabel: {
          formatter: function(value) {
            return value.substring(5);
          }
        }
      },
      yAxis: {
        type: 'category',
        data: hours,
        splitArea: {
          show: true
        },
        axisLabel: {
          formatter: '{value}:00'
        }
      },
      visualMap: {
        min: 0,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '15%',
        formatter: function(value) {
          return (value * 100).toFixed(0) + '%';
        },
        inRange: {
          color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffcc', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
        }
      },
      series: [{
        name: '准确率',
        type: 'heatmap',
        data: data,
        label: {
          show: true,
          formatter: function(params) {
            return (params.value[2] * 100).toFixed(0) + '%';
          }
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
    
    myChart.setOption(option);
    
    window.addEventListener('resize', () => {
      myChart.resize();
    });
    
    return myChart;
  },

  /**
   * 创建漏斗图 - 显示预测流程各阶段的数据量
   * @param {string} elementId - 图表容器ID
   * @param {Array} funnelData - 漏斗图数据 [{name, value}]
   * @returns {echarts.ECharts} 图表实例
   */
  createPredictionFunnelChart(elementId, funnelData) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return null;
    
    const myChart = echarts.init(chartDom);
    
    const option = {
      title: {
        text: '预测流程数据漏斗',
        left: 'center',
        textStyle: {
          fontSize: 16,
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b} : {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        data: funnelData.map(item => item.name)
      },
      series: [
        {
          name: '预测流程',
          type: 'funnel',
          left: '10%',
          top: 60,
          bottom: 60,
          width: '80%',
          min: 0,
          max: Math.max(...funnelData.map(item => item.value)),
          minSize: '0%',
          maxSize: '100%',
          sort: 'descending',
          gap: 2,
          label: {
            show: true,
            position: 'inside'
          },
          labelLine: {
            length: 10,
            lineStyle: {
              width: 1,
              type: 'solid'
            }
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1
          },
          emphasis: {
            label: {
              fontSize: 20
            }
          },
          data: funnelData
        }
      ]
    };
    
    myChart.setOption(option);
    
    window.addEventListener('resize', () => {
      myChart.resize();
    });
    
    return myChart;
  },

  /**
   * 创建仪表盘 - 显示整体预测准确率
   * @param {string} elementId - 图表容器ID
   * @param {number} accuracy - 准确率 (0-1)
   * @param {string} title - 标题
   * @returns {echarts.ECharts} 图表实例
   */
  createAccuracyGauge(elementId, accuracy, title = '整体预测准确率') {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return null;
    
    const myChart = echarts.init(chartDom);
    
    const option = {
      title: {
        text: title,
        left: 'center',
        top: '10%',
        textStyle: {
          fontSize: 16,
          color: '#333'
        }
      },
      series: [
        {
          name: '准确率',
          type: 'gauge',
          progress: {
            show: true
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}%'
          },
          data: [
            {
              value: accuracy * 100,
              name: '准确率'
            }
          ],
          axisLine: {
            lineStyle: {
              width: 30,
              color: [
                [0.3, '#ff4d4f'],
                [0.7, '#faad14'],
                [1, '#52c41a']
              ]
            }
          },
          pointer: {
            itemStyle: {
              color: 'auto'
            }
          },
          axisTick: {
            distance: -30,
            length: 8,
            lineStyle: {
              color: '#fff',
              width: 2
            }
          },
          splitLine: {
            distance: -30,
            length: 30,
            lineStyle: {
              color: '#fff',
              width: 4
            }
          },
          axisLabel: {
            color: 'auto',
            distance: 40,
            fontSize: 12,
            formatter: '{value}%'
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            color: 'auto',
            fontSize: 20
          }
        }
      ]
    };
    
    myChart.setOption(option);
    
    window.addEventListener('resize', () => {
      myChart.resize();
    });
    
    return myChart;
  },

  /**
   * 创建桑基图 - 显示预测结果流向
   * @param {string} elementId - 图表容器ID
   * @param {Object} sankeyData - 桑基图数据 {nodes: [], links: []}
   * @returns {echarts.ECharts} 图表实例
   */
  createPredictionSankeyChart(elementId, sankeyData) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return null;
    
    const myChart = echarts.init(chartDom);
    
    const option = {
      title: {
        text: '预测结果流向分析',
        left: 'center',
        textStyle: {
          fontSize: 16,
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove'
      },
      series: [
        {
          type: 'sankey',
          data: sankeyData.nodes,
          links: sankeyData.links,
          emphasis: {
            focus: 'adjacency'
          },
          lineStyle: {
            color: 'gradient',
            curveness: 0.5
          }
        }
      ]
    };
    
    myChart.setOption(option);
    
    window.addEventListener('resize', () => {
      myChart.resize();
    });
    
    return myChart;
  },

  /**
   * 图表工具函数
   */
  utils: {
    /**
     * 导出图表为图片
     * @param {echarts.ECharts} chart - 图表实例
     * @param {string} filename - 文件名
     * @param {string} type - 图片类型 ('png' | 'jpeg')
     */
    exportChart(chart, filename = 'chart', type = 'png') {
      const url = chart.getDataURL({
        type: type,
        pixelRatio: 2,
        backgroundColor: '#fff'
      });
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${type}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    /**
     * 批量销毁图表实例
     * @param {Array} charts - 图表实例数组
     */
    disposeCharts(charts) {
      charts.forEach(chart => {
        if (chart && typeof chart.dispose === 'function') {
          chart.dispose();
        }
      });
    },

    /**
     * 设置图表主题
     * @param {string} theme - 主题名称 ('light' | 'dark')
     */
    setTheme(theme) {
      // 注册自定义主题
      if (theme === 'dark') {
        echarts.registerTheme('dark', {
          color: ['#dd6b66', '#759aa0', '#e69d87', '#8dc1a9', '#ea7e53', '#eedd78', '#73a373', '#73b9bc', '#7289ab', '#91ca8c', '#f49f42'],
          backgroundColor: 'rgba(0,0,0,0)',
          textStyle: {},
          title: {
            textStyle: {
              color: '#ffffff'
            },
            subtextStyle: {
              color: '#dddddd'
            }
          }
        });
      }
    },

    /**
     * 格式化数据为时间序列
     * @param {Array} data - 原始数据
     * @param {string} dateField - 日期字段名
     * @param {string} valueField - 值字段名
     * @returns {Object} 格式化后的数据
     */
    formatTimeSeriesData(data, dateField, valueField) {
      return data.map(item => [item[dateField], item[valueField]]);
    },

    /**
     * 计算移动平均线
     * @param {Array} data - 数据数组
     * @param {number} period - 周期
     * @returns {Array} 移动平均线数据
     */
    calculateMovingAverage(data, period) {
      const result = [];
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          result.push(null);
        } else {
          const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
          result.push(sum / period);
        }
      }
      return result;
    },

    /**
     * 数据聚合
     * @param {Array} data - 原始数据
     * @param {string} groupBy - 分组字段
     * @param {string} aggregateField - 聚合字段
     * @param {string} method - 聚合方法 ('sum' | 'avg' | 'count' | 'max' | 'min')
     * @returns {Array} 聚合后的数据
     */
    aggregateData(data, groupBy, aggregateField, method = 'sum') {
      const grouped = data.reduce((acc, item) => {
        const key = item[groupBy];
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item[aggregateField]);
        return acc;
      }, {});

      return Object.keys(grouped).map(key => {
        const values = grouped[key];
        let aggregatedValue;
        
        switch (method) {
          case 'sum':
            aggregatedValue = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case 'count':
            aggregatedValue = values.length;
            break;
          case 'max':
            aggregatedValue = Math.max(...values);
            break;
          case 'min':
            aggregatedValue = Math.min(...values);
            break;
          default:
            aggregatedValue = values.reduce((a, b) => a + b, 0);
        }
        
        return {
          [groupBy]: key,
          [aggregateField]: aggregatedValue
        };
      });
    }
  }
};

export default chartUtils;
