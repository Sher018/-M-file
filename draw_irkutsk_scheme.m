% draw_irkutsk_scheme.m
% Структурная схема участка электросетей Иркутска (110/10 кВ)
% Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
% Версия: 1.2.2
% Подраздел диплома: глава 3 (схема объекта исследования)
% Для главы 3 и Приложения Б ВКР

clear; clc; close all;

rootDir = fileparts(mfilename('fullpath'));
if ~isempty(rootDir)
    addpath(rootDir);
    sc_ensure_results_dirs(rootDir);
end

figure('Name', 'Структурная схема электросетей г. Иркутска', ...
    'Position', [100 100 900 600], 'Color', 'w');

hold on; grid on; axis equal; axis off;

rectangle('Position', [0.5 8 1 1], 'FaceColor', [0.9 0.9 1], 'EdgeColor', 'k', 'LineWidth', 2);
text(1, 8.5, 'Иркутская ГЭС / ТЭЦ-10', 'HorizontalAlignment', 'center', ...
    'FontSize', 10, 'FontName', 'Times New Roman');

rectangle('Position', [4 6 2 2], 'FaceColor', [0.85 0.85 0.95], 'EdgeColor', 'k', 'LineWidth', 2);
text(5, 7, 'ПС 220 кВ Шелехово', 'HorizontalAlignment', 'center', ...
    'FontSize', 11, 'FontName', 'Times New Roman');

plot([1.5 4.5], [8.5 7.5], 'k-', 'LineWidth', 2.5);
text(2.8, 8.1, 'ВЛ 220 кВ', 'Rotation', 35, 'FontSize', 9);

rectangle('Position', [8 4 2 1.5], 'FaceColor', [0.9 0.95 0.9], 'EdgeColor', 'k', 'LineWidth', 2);
text(9, 4.8, 'ПС 110 кВ Рассоха', 'HorizontalAlignment', 'center', 'FontSize', 10);

rectangle('Position', [8 1.5 2 1.5], 'FaceColor', [0.9 0.95 0.9], 'EdgeColor', 'k', 'LineWidth', 2);
text(9, 2.3, 'ПС 110 кВ Большой Луг', 'HorizontalAlignment', 'center', 'FontSize', 10);

rectangle('Position', [13 2.5 1.8 2], 'FaceColor', [1 0.95 0.85], 'EdgeColor', 'k', 'LineWidth', 2);
text(13.9, 3.5, 'ПС 110/10 кВ (2×25 МВА)', 'HorizontalAlignment', 'center', 'FontSize', 10);

plot([14.8 17], [4 4], 'k-', 'LineWidth', 2);
text(15.5, 4.2, 'Линии 10 кВ (пром. нагрузка)');
plot([14.8 17], [2.5 2.5], 'k-', 'LineWidth', 2);
text(15.5, 2.7, 'Линии 10 кВ (жил. район)');

title('Рисунок 3.2 — Упрощённая структурная схема участка электросетей г. Иркутска (110/10 кВ)', ...
    'FontName', 'Times New Roman', 'FontSize', 12);

hold off;

outDir = fullfile(rootDir, 'results', 'figures');
print(gcf, fullfile(outDir, 'irkutsk_scheme.png'), '-dpng', '-r300');
print(gcf, fullfile(outDir, 'irkutsk_scheme.eps'), '-depsc2');
