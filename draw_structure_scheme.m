% draw_structure_scheme.m
% Структурная схема программного комплекса M-file сценариев SC_Calculator
% Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
% Версия: 1.2.2
% Подраздел диплома: 3.1 «Структура и организация комплекса M-file сценариев»
% Запуск: draw_structure_scheme  (сохраняет PNG/EPS в results/figures/)

clear; clc; close all;

rootDir = fileparts(mfilename('fullpath'));
if ~isempty(rootDir)
    addpath(rootDir);
end
sc_ensure_results_dirs(rootDir);

figure('Name', 'Структурная схема комплекса SC_Calculator', ...
    'Position', [80 80 1100 720], 'Color', 'w');

hold on;
axis([0 22 0 14]);
axis off;

fontName = 'Times New Roman';
fontBox = 9;
fontTitle = 10;
lw = 1.8;

% --- Вспомогательные функции рисования (локально через анонимные вызовы) ---
drawBox = @(x, y, w, h, txt, fc) draw_module_box(x, y, w, h, txt, fc, fontName, fontBox);
drawArrow = @(x1, y1, x2, y2) plot([x1 x2], [y1 y2], 'k-', 'LineWidth', lw);
drawArrowDown = @(xc, y1, y2) drawArrow(xc, y1, xc, y2);

% --- Точки входа (GUI и Octave) ---
drawBox(1.0, 11.8, 3.6, 1.0, {'sc_calculator_gui.m'; '(MATLAB, uifigure)'}, [0.92 0.94 1.0]);
drawBox(5.2, 11.8, 3.8, 1.0, {'run_sc_octave.m / oct_sc_menu.m'; '(GNU Octave)'}, [0.94 0.92 1.0]);
drawBox(9.6, 11.8, 2.8, 1.0, {'run_all.m'; '(calc / test / both)'}, [0.93 0.93 0.93]);

% --- Главный модуль ---
drawBox(7.2, 9.6, 4.6, 1.2, {'main_calc_sc.m'; 'главный сценарий расчёта токов КЗ'}, [1.0 0.93 0.82]);

drawArrowDown(2.8, 11.8, 10.8);
drawArrowDown(7.1, 11.8, 10.8);
drawArrowDown(11.0, 11.8, 10.8);
plot([2.8 9.5], [10.8 10.8], 'k-', 'LineWidth', lw);
plot([11.0 9.5], [10.8 10.8], 'k-', 'LineWidth', lw);
drawArrowDown(9.5, 10.8, 10.8);

% --- Блок импорта ---
drawBox(7.4, 7.8, 4.2, 1.0, {'func_import_data.m'; 'импорт Excel → Z1, Z2, Z0, E, Uном'}, [0.88 0.95 0.88]);
drawArrowDown(9.5, 9.6, 8.8);

% --- Вычислительные модули (ряд) ---
modsY = 5.6;
modW = 3.6;
modH = 1.15;
gap = 0.35;
x1 = 0.8;
x2 = x1 + modW + gap;
x3 = x2 + modW + gap;
x4 = x3 + modW + gap;
x5 = x4 + modW + gap;

drawBox(x1, modsY, modW, modH, {'func_sym_components.m'; 'I1, I2, I0 (Фортескью)'}, [0.90 0.92 0.98]);
drawBox(x2, modsY, modW, modH, {'func_sc_currents.m'; 'Ik3, Ik2, Ik1 (кА)'}, [0.90 0.92 0.98]);
drawBox(x3, modsY, modW, modH, {'func_impact_current.m'; 'iуд, kуд (R/X)'}, [0.90 0.92 0.98]);
drawBox(x4, modsY, modW, modH, {'func_network_tau.m'; 'постоянная τ'}, [0.90 0.92 0.98]);
drawBox(x5, modsY, modW, modH, {'func_pack_results_meta.m'; 'метаданные отчёта'}, [0.95 0.95 0.95]);

drawArrowDown(9.5, 7.8, 6.75);
plot([9.5 2.6], [6.75 6.75], 'k-', 'LineWidth', lw);
for xc = [2.6, 6.55, 10.5, 14.45, 18.4]
    drawArrowDown(xc, 6.75, 6.75);
end

% --- Визуализация и вывод ---
outY = 3.2;
drawBox(1.5, outY, 4.2, 1.1, {'func_oscillogram.m'; 'осциллограмма → figures/'}, [0.98 0.92 0.88]);
drawBox(8.3, outY, 4.2, 1.1, {'func_export_results.m'; 'таблица → results/'}, [0.98 0.92 0.88]);
drawBox(15.1, outY, 4.2, 1.1, {'func_report.m'; 'отчёт → docs/'}, [0.98 0.92 0.88]);

for xc = [3.6, 10.4, 17.2]
    drawArrowDown(xc, 5.6, 4.3);
end

% --- Входные/выходные данные ---
rectangle('Position', [0.3 0.4 4.8 0.9], 'FaceColor', [1 1 0.92], 'EdgeColor', 'k', 'LineWidth', 1.2);
text(2.7, 0.85, 'Вход: network_parameters.xlsx', 'HorizontalAlignment', 'center', ...
    'FontName', fontName, 'FontSize', fontBox);

rectangle('Position', [8.5 0.4 10.5 0.9], 'FaceColor', [0.92 1 0.92], 'EdgeColor', 'k', 'LineWidth', 1.2);
text(13.75, 0.85, 'Выход: results/figures/, results/results_sc.*, results/docs/report_sc.txt', ...
    'HorizontalAlignment', 'center', 'FontName', fontName, 'FontSize', fontBox);

text(11.0, 13.5, sprintf('Комплекс SC_Calculator, версия %s', sc_version()), ...
    'HorizontalAlignment', 'center', 'FontName', fontName, 'FontSize', fontTitle, 'FontWeight', 'bold');

title('Рисунок 3.1 — Структурная схема комплекса M-file сценариев', ...
    'FontName', fontName, 'FontSize', 12);

hold off;

outDir = fullfile(rootDir, 'results', 'figures');
pngPath = fullfile(outDir, 'structure_scheme.png');
epsPath = fullfile(outDir, 'structure_scheme.eps');

if exist('OCTAVE_VERSION', 'builtin') ~= 0
    print(gcf, pngPath, '-dpng', '-r300');
    try
        print(gcf, epsPath, '-depsc2');
    catch
    end
else
    print(gcf, pngPath, '-dpng', '-r300');
    print(gcf, epsPath, '-depsc2');
end

fprintf('Структурная схема сохранена:\n  %s\n  %s\n', pngPath, epsPath);

function draw_module_box(x, y, w, h, txt, faceColor, fontName, fontSize)
    rectangle('Position', [x y w h], 'FaceColor', faceColor, 'EdgeColor', 'k', 'LineWidth', 1.5);
    if ischar(txt)
        txt = {txt};
    end
    n = numel(txt);
    for k = 1:n
        ty = y + h - (k / (n + 1)) * h;
        text(x + w / 2, ty, txt{k}, 'HorizontalAlignment', 'center', ...
            'FontName', fontName, 'FontSize', fontSize);
    end
end
