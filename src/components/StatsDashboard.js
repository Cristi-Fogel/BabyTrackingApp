import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function StatsDashboard({ entries, currentTheme }) {
  const [activeTab, setActiveTab] = useState('milk'); // 'milk' | 'sleep' | 'growth_kg' | 'growth_cm'
  const [period, setPeriod] = useState('day'); // 'day' | 'week' | 'month' | 'year'
  const [offsetIndex, setOffsetIndex] = useState(0);

  const scrollViewRef = useRef(null);

  const scrollToCurrent = () => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  useEffect(() => {
    setOffsetIndex(0);
    if ((activeTab === 'growth_kg' || activeTab === 'growth_cm') && period === 'day') {
      setPeriod('week');
    }
  }, [activeTab]);

  useEffect(() => {
    scrollToCurrent();
  }, [activeTab, period, offsetIndex]);

  const cleanDate = (dateStr) => {
    if (!dateStr) return '';
    const str = String(dateStr);
    if (str.includes('-')) return str.split('T')[0];
    return str.substring(0, 10);
  };

  const getMilkData = () => {
    const map = {};
    entries.forEach((item) => {
      const type = String(item.type || '').toLowerCase();
      if (type === 'milk' || type === 'lapte') {
        const d = cleanDate(item.date);
        if (!d) return;
        const match = String(item.value || '').match(/(\d+)\s*ml/i);
        const ml = match ? parseInt(match[1], 10) : 0;
        map[d] = (map[d] || 0) + ml;
      }
    });
    return map;
  };

  const getSleepData = () => {
    const map = {};
    entries.forEach((item) => {
      const type = String(item.type || '').toLowerCase();
      if (type === 'sleep') {
        const d = cleanDate(item.date);
        if (!d) return;
        const valStr = String(item.value || '');
        let hours = 0;
        const hMatch = valStr.match(/([\d.]+)\s*h/i);
        const mMatch = valStr.match(/(\d+)\s*m/i);
        if (hMatch) hours += parseFloat(hMatch[1]);
        if (mMatch) hours += parseFloat(mMatch[1]) / 60;
        if (hours === 0 && valStr.includes('Adormit la')) hours = 1.5;
        map[d] = (map[d] || 0) + hours;
      }
    });
    return map;
  };

  const getGrowthData = () => {
    const list = [];
    entries.forEach((item) => {
      const type = String(item.type || '').toLowerCase();
      if (type === 'growth' || type === 'crestere') {
        const d = cleanDate(item.date);
        const valStr = String(item.value || '').replace(',', '.');
        const kgMatch = valStr.match(/([\d.]+)\s*kg/i);
        const cmMatch = valStr.match(/([\d.]+)\s*cm/i);

        if (d && (kgMatch || cmMatch)) {
          list.push({
            date: d,
            kg: kgMatch ? parseFloat(kgMatch[1]) : 0,
            cm: cmMatch ? parseFloat(cmMatch[1]) : 0,
          });
        }
      }
    });
    return list.sort((a, b) => a.date.localeCompare(b.date));
  };

  const generateChartData = () => {
    const data = [];
    const now = new Date();
    const todayFormatted = `${now.getDate()}.${now.getMonth() + 1}`;

    if (activeTab === 'growth_kg' || activeTab === 'growth_cm') {
      const growthList = getGrowthData();
      const subKey = activeTab === 'growth_kg' ? 'kg' : 'cm';

      if (period === 'month') {
        const step = 12;
        for (let i = step - 1 - (offsetIndex * step); i >= 0 - (offsetIndex * step); i--) {
          const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthName = targetMonthDate.toLocaleDateString('ro-RO', { month: 'short' });
          const yearNum = targetMonthDate.getFullYear();

          let periodVal = 0;
          growthList.forEach(item => {
            const itemDate = new Date(item.date);
            if (
              itemDate.getMonth() === targetMonthDate.getMonth() &&
              itemDate.getFullYear() === targetMonthDate.getFullYear()
            ) {
              periodVal = item[subKey];
            }
          });

          const isCurrent = targetMonthDate.getMonth() === now.getMonth() && targetMonthDate.getFullYear() === now.getFullYear();
          data.push({
            label: isCurrent ? `Azi\n${todayFormatted}` : `${monthName}\n${yearNum}`,
            value: periodVal,
            displayVal: periodVal > 0 ? `${periodVal}${subKey === 'kg' ? 'kg' : 'cm'}` : '',
            isCurrent,
          });
        }
        return data;
      } else {
        const rangeCount = period === 'week' ? 12 : 5;
        for (let i = rangeCount - (offsetIndex * rangeCount); i >= -(offsetIndex * rangeCount); i--) {
          const targetDate = new Date(now);
          if (period === 'week') targetDate.setDate(targetDate.getDate() - (i * 7));
          if (period === 'year') targetDate.setFullYear(targetDate.getFullYear() - i);

          let periodVal = 0;
          const monthName = targetDate.toLocaleDateString('ro-RO', { month: 'short' });
          const weekNum = rangeCount - i;
          let labelText = period === 'week' ? `Săpt ${weekNum}\n${monthName}` : `${targetDate.getFullYear()}`;

          growthList.forEach(item => {
            const itemDate = new Date(item.date);
            if (period === 'year' && itemDate.getFullYear() === targetDate.getFullYear()) {
              periodVal = item[subKey];
            } else if (period === 'week') {
              periodVal = item[subKey];
            }
          });

          const isCurrent = i === 0 && offsetIndex === 0;
          data.push({
            label: isCurrent ? `Azi\n${todayFormatted}` : labelText,
            value: periodVal,
            displayVal: periodVal > 0 ? `${periodVal}${subKey === 'kg' ? 'kg' : 'cm'}` : '',
            isCurrent,
          });
        }
        return data;
      }
    }

    const rawMap = activeTab === 'milk' ? getMilkData() : getSleepData();
    const unit = activeTab === 'milk' ? 'ml' : 'h';

    if (period === 'day') {
      const step = 25;
      for (let i = step - 1 - (offsetIndex * step); i >= 0 - (offsetIndex * step); i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('ro-RO', { weekday: 'short' });
        const dateStr = `${d.getDate()}.${d.getMonth() + 1}`;

        const val = rawMap[dateKey] || 0;
        const isCurrent = i === 0 && offsetIndex === 0;
        data.push({
          label: isCurrent ? `Azi\n${dateStr}` : `${dayName}\n${dateStr}`,
          value: activeTab === 'sleep' ? Number(val.toFixed(1)) : val,
          displayVal: val > 0 ? `${activeTab === 'sleep' ? val.toFixed(1) : val}${unit}` : '',
          isCurrent,
        });
      }
    } else if (period === 'week') {
      const step = 12;
      for (let i = step - 1 - (offsetIndex * step); i >= 0 - (offsetIndex * step); i--) {
        let total = 0;
        let daysWithData = 0;

        const midWeekDate = new Date(now);
        midWeekDate.setDate(midWeekDate.getDate() - (i * 7 + 3));
        const monthName = midWeekDate.toLocaleDateString('ro-RO', { month: 'short' });
        const weekNum = step - i; // Numărul săptămânii în serie (1, 2, 3...)

        for (let j = 0; j < 7; j++) {
          const d = new Date(now);
          d.setDate(d.getDate() - (i * 7 + j));
          const dateKey = d.toISOString().split('T')[0];
          if (rawMap[dateKey] !== undefined) {
            total += rawMap[dateKey];
            daysWithData++;
          }
        }
        const avgVal = daysWithData > 0 ? (activeTab === 'sleep' ? Number((total / daysWithData).toFixed(1)) : Math.round(total / daysWithData)) : 0;
        const isCurrent = i === 0 && offsetIndex === 0;

        data.push({
          label: isCurrent ? `Azi\n${todayFormatted}` : `Săpt ${weekNum}\n${monthName}`,
          value: avgVal,
          displayVal: avgVal > 0 ? `${avgVal}${unit}/zi` : '',
          isCurrent,
        });
      }
    } else if (period === 'month') {
      const step = 12;
      for (let i = step - 1 - (offsetIndex * step); i >= 0 - (offsetIndex * step); i--) {
        const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = targetMonthDate.toLocaleDateString('ro-RO', { month: 'short' });
        const yearNum = targetMonthDate.getFullYear();

        let monthTotal = 0;
        let countDays = 0;

        Object.keys(rawMap).forEach((dateStr) => {
          const itemDate = new Date(dateStr);
          if (
            itemDate.getMonth() === targetMonthDate.getMonth() &&
            itemDate.getFullYear() === targetMonthDate.getFullYear()
          ) {
            monthTotal += rawMap[dateStr];
            countDays++;
          }
        });

        const monthAvg = countDays > 0 ? (activeTab === 'sleep' ? Number((monthTotal / countDays).toFixed(1)) : Math.round(monthTotal / countDays)) : 0;
        const isCurrent = targetMonthDate.getMonth() === now.getMonth() && targetMonthDate.getFullYear() === now.getFullYear();

        data.push({
          label: isCurrent ? `Azi\n${todayFormatted}` : `${monthName}\n${yearNum}`,
          value: monthAvg,
          displayVal: monthAvg > 0 ? `${monthAvg}${unit}/zi` : '',
          isCurrent,
        });
      }
    } else if (period === 'year') {
      const step = 5;
      for (let i = step - 1 - (offsetIndex * step); i >= 0 - (offsetIndex * step); i--) {
        const targetYear = now.getFullYear() - i;
        let yearTotal = 0;
        let countDays = 0;

        Object.keys(rawMap).forEach((dateStr) => {
          const itemDate = new Date(dateStr);
          if (itemDate.getFullYear() === targetYear) {
            yearTotal += rawMap[dateStr];
            countDays++;
          }
        });

        const yearAvg = countDays > 0 ? (activeTab === 'sleep' ? Number((yearTotal / countDays).toFixed(1)) : Math.round(yearTotal / countDays)) : 0;
        const isCurrent = i === 0 && offsetIndex === 0;

        data.push({
          label: isCurrent ? `Azi\n${todayFormatted}` : `${targetYear}`,
          value: yearAvg,
          displayVal: yearAvg > 0 ? `${yearAvg}${unit}/zi` : '',
          isCurrent,
        });
      }
    }

    return data;
  };

  const chartData = generateChartData();

  let roundedMax = 600;
  let stepVal = 120;

  if (activeTab === 'sleep') {
    const rawMaxSleep = Math.max(...chartData.map((i) => i.value), 12);
    roundedMax = rawMaxSleep <= 16 ? 16 : 24;
    stepVal = roundedMax / 4;
  } else if (activeTab === 'growth_kg') {
    const rawMaxKg = Math.max(...chartData.map((i) => i.value), 10);
    roundedMax = Math.ceil(rawMaxKg * 1.2);
    stepVal = roundedMax / 5;
  } else if (activeTab === 'growth_cm') {
    const rawMaxCm = Math.max(...chartData.map((i) => i.value), 50);
    roundedMax = Math.ceil(rawMaxCm * 1.1);
    stepVal = roundedMax / 5;
  } else {
    const rawMaxVal = Math.max(...chartData.map((i) => i.value), 100);
    roundedMax = Math.ceil(rawMaxVal / 100) * 100;
    stepVal = roundedMax / 5;
  }

  let accentColor = '#E67E22';
  if (activeTab === 'sleep') accentColor = '#2980B9';
  if (activeTab === 'growth_kg' || activeTab === 'growth_cm') accentColor = '#27AE60';

  const getCalculationLabel = () => {
    if (activeTab === 'growth_kg') return 'Măsurătoare KG';
    if (activeTab === 'growth_cm') return 'Măsurătoare CM';
    if (activeTab === 'sleep' && period === 'day') return 'Somn zilnic (h)';
    if (activeTab === 'sleep') return 'Media somn zilnic (h)';
    if (period === 'day') return 'Valoare zilnică';
    return 'Media zilnică';
  };

  return (
    <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>

      {/* 1. Header Sus: Categorii + Informații */}
      <View style={styles.topHeaderContainer}>
        <View style={styles.headerCategoryRow}>
          <TouchableOpacity
            style={[styles.headerActBtn, activeTab === 'milk' ? { backgroundColor: '#E67E22' } : { backgroundColor: currentTheme.background, borderWidth: 1, borderColor: currentTheme.border }]}
            onPress={() => setActiveTab('milk')}
          >
            <FontAwesome5 name="wine-bottle" size={10} color="#FFF" />
            <Text style={[styles.headerActText, activeTab !== 'milk' && { color: currentTheme.textMain }]}>Lapte</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActBtn, activeTab === 'sleep' ? { backgroundColor: '#2980B9' } : { backgroundColor: currentTheme.background, borderWidth: 1, borderColor: currentTheme.border }]}
            onPress={() => setActiveTab('sleep')}
          >
            <Ionicons name="moon-outline" size={11} color="#FFF" />
            <Text style={[styles.headerActText, activeTab !== 'sleep' && { color: currentTheme.textMain }]}>Somn</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActBtn, activeTab === 'growth_kg' ? { backgroundColor: '#27AE60' } : { backgroundColor: currentTheme.background, borderWidth: 1, borderColor: currentTheme.border }]}
            onPress={() => setActiveTab('growth_kg')}
          >
            <MaterialCommunityIcons name="weight" size={11} color="#FFF" />
            <Text style={[styles.headerActText, activeTab !== 'growth_kg' && { color: currentTheme.textMain }]}>KG</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActBtn, activeTab === 'growth_cm' ? { backgroundColor: '#27AE60' } : { backgroundColor: currentTheme.background, borderWidth: 1, borderColor: currentTheme.border }]}
            onPress={() => setActiveTab('growth_cm')}
          >
            <MaterialCommunityIcons name="ruler" size={11} color="#FFF" />
            <Text style={[styles.headerActText, activeTab !== 'growth_cm' && { color: currentTheme.textMain }]}>CM</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.infoBarTextTopRight, { color: currentTheme.textSub }]}>
          📊 {getCalculationLabel()}
        </Text>
      </View>

      {/* 2. Rând Secundar: Selectori Perioadă + Buton Salt la Zi (>) */}
      <View style={styles.subHeaderContainer}>
        <View style={[styles.tabsContainer, { backgroundColor: currentTheme.background }]}>
          {activeTab !== 'growth_kg' && activeTab !== 'growth_cm' && (
            <TouchableOpacity
              style={[styles.tabButton, period === 'day' && { backgroundColor: currentTheme.cardBackground, borderColor: accentColor, borderWidth: 1.5 }]}
              onPress={() => setPeriod('day')}
            >
              <Text style={[styles.tabText, { color: period === 'day' ? currentTheme.textMain : currentTheme.textSub }]}>ZI</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.tabButton, period === 'week' && { backgroundColor: currentTheme.cardBackground, borderColor: accentColor, borderWidth: 1.5 }]}
            onPress={() => setPeriod('week')}
          >
            <Text style={[styles.tabText, { color: period === 'week' ? currentTheme.textMain : currentTheme.textSub }]}>SĂPT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, period === 'month' && { backgroundColor: currentTheme.cardBackground, borderColor: accentColor, borderWidth: 1.5 }]}
            onPress={() => setPeriod('month')}
          >
            <Text style={[styles.tabText, { color: period === 'month' ? currentTheme.textMain : currentTheme.textSub }]}>LUNĂ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, period === 'year' && { backgroundColor: currentTheme.cardBackground, borderColor: accentColor, borderWidth: 1.5 }]}
            onPress={() => setPeriod('year')}
          >
            <Text style={[styles.tabText, { color: period === 'year' ? currentTheme.textMain : currentTheme.textSub }]}>AN</Text>
          </TouchableOpacity>
        </View>

        {/* Butonul de Salt Rapid la Zi (>) */}
        <TouchableOpacity
          onPress={() => {
            setOffsetIndex(Math.max(0, offsetIndex - 1));
            scrollToCurrent();
          }}
          style={[styles.jumpButton, { backgroundColor: currentTheme.background, borderColor: accentColor }]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={14} color={accentColor} />
        </TouchableOpacity>
      </View>

      {/* 3. Zona Grafic */}
      <View style={styles.chartArea}>

        <View style={styles.yAxis} pointerEvents="none">
          {activeTab === 'sleep' ? (
            [4, 3, 2, 1, 0].map((stepMultiplier) => (
              <Text key={stepMultiplier} style={[styles.axisText, { color: currentTheme.textSub }]}>
                {Math.round(stepVal * stepMultiplier)}h
              </Text>
            ))
          ) : (
            [5, 4, 3, 2, 1, 0].map((stepMultiplier) => (
              <Text key={stepMultiplier} style={[styles.axisText, { color: currentTheme.textSub }]}>
                {Math.round(stepVal * stepMultiplier)}
              </Text>
            ))
          )}
        </View>

        <View style={styles.gridLinesContainer} pointerEvents="none">
          {(activeTab === 'sleep' ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.2, 0.4, 0.6, 0.8, 1]).map((_, idx) => (
            <View key={idx} style={[styles.gridLine, { borderColor: currentTheme.border }]} />
          ))}
        </View>

        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.barsScroll}
        >
          {chartData.map((item, index) => {
            const barHeightPct = roundedMax > 0 ? Math.min(Math.max((item.value / roundedMax) * 100, 4), 100) : 4;
            const barColor = item.isCurrent ? '#F39C12' : accentColor;

            return (
              <View key={index} style={styles.barColumn}>
                <Text style={[styles.barValueText, item.isCurrent && { color: '#F39C12' }, { color: accentColor }]} numberOfLines={1}>
                  {item.displayVal}
                </Text>

                <View style={[styles.barTrack, { backgroundColor: 'rgba(40,40,40,0.8)', borderColor: currentTheme.border }, item.isCurrent && { borderColor: '#F39C12', borderWidth: 1.5 }]}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${barHeightPct}%`, backgroundColor: barColor }
                    ]}
                  />
                </View>

                <View style={styles.labelContainer}>
                  <Text style={[styles.barLabel, item.isCurrent && { fontWeight: 'bold', color: '#F39C12' }, { color: currentTheme.textSub }]} numberOfLines={2}>
                    {item.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 4,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  topHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerCategoryRow: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 6,
  },
  headerActBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    marginHorizontal: 1,
    borderRadius: 6,
  },
  headerActText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 9,
    marginLeft: 2,
  },
  infoBarTextTopRight: {
    fontSize: 8,
    fontStyle: 'italic',
  },
  subHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 2,
    marginRight: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 1,
  },
  tabText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  jumpButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  chartArea: {
    flexDirection: 'row',
    height: 145,
    alignItems: 'center',
    marginTop: 2,
    position: 'relative',
  },
  yAxis: {
    width: 32,
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 4,
    paddingBottom: 26,
    zIndex: 1,
  },
  axisText: {
    fontSize: 7.5,
  },
  gridLinesContainer: {
    position: 'absolute',
    left: 32,
    right: 0,
    top: 5,
    bottom: 26,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  gridLine: {
    width: '100%',
    borderBottomWidth: 0.5,
    opacity: 0.3,
  },
  barsScroll: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
    zIndex: 2,
  },
  barColumn: {
    width: 46,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 3,
  },
  barValueText: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 3,
    textAlign: 'center',
    height: 12,
  },
  barTrack: {
    width: 18,
    height: 90,
    borderRadius: 9,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
  },
  barFill: {
    width: '100%',
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
  },
  labelContainer: {
    height: 26,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 4,
  },
  barLabel: {
    fontSize: 8,
    textAlign: 'center',
  },
});