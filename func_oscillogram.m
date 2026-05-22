function outPath = func_oscillogram(Ik, f, T, varargin)
    % FUNC_OSCILLOGRAM Построение осциллограммы мгновенного тока при коротком замыкании.
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.2.2
    % Подраздел диплома: 3.6 «Главный сценарий main_calc_sc.m и интеграция модулей»
    %
    % func_oscillogram(Ik, f, T)
    %   Упрощённая форма: i = Ik·√2·(sin(ωt) − e^(−t/τ)), τ = 0.05 с.
    %
    % func_oscillogram(Ik, f, T, tau, alpha_deg, three_phase)
    %   i = Ik·√2·(sin(ωt+ψ) − sin(ψ)·e^(−t/τ)), ψ = alpha_deg·π/180.
    %   three_phase = true — фазы A, B, C (сдвиг 120°).

    rootDir = fileparts(mfilename('fullpath'));
    sc_ensure_results_dirs(rootDir);

    t = 0:0.0001:T;
    omega = 2 * pi * f;
    Im = Ik * sqrt(2);

    if nargin <= 3
        tau = 0.05;
        iA = Im * (sin(omega * t) - exp(-t / tau));
        figure('Name', 'Осциллограмма тока при КЗ', 'Position', [200 200 900 500]);
        plot(t * 1000, iA, 'b', 'LineWidth', 2.2);
        grid on;
        xlabel('Время, мс');
        ylabel('Мгновенный ток, кА');
        title(sprintf('Переходный процесс (I_k = %.2f кА, упрощённая форма)', Ik));
        legend('Ток фазы A', 'location', 'northeast');
    else
        tau = varargin{1};
        if isempty(tau) || ~(isfinite(tau) && tau > 0)
            tau = 0.05;
        end
        alpha_deg = 0;
        if numel(varargin) >= 2 && ~isempty(varargin{2})
            alpha_deg = varargin{2};
        end
        three_phase = false;
        if numel(varargin) >= 3
            three_phase = logical(varargin{3});
        end

        psi = alpha_deg * pi / 180;
        iA = phase_current(Im, omega, t, tau, psi);
        figure('Name', 'Осциллограмма тока при КЗ', 'Position', [200 200 900 500]);
        hold on;
        plot(t * 1000, iA, 'b', 'LineWidth', 2.2);
        leg = {'Ток фазы A'};
        if three_phase
            iB = phase_current(Im, omega, t, tau, psi - 2 * pi / 3);
            iC = phase_current(Im, omega, t, tau, psi + 2 * pi / 3);
            plot(t * 1000, iB, 'r', 'LineWidth', 1.8);
            plot(t * 1000, iC, 'Color', [0 0.55 0], 'LineWidth', 1.8);
            leg = {'Ток фазы A', 'Ток фазы B', 'Ток фазы C'};
        end
        hold off;
        grid on;
        xlabel('Время, мс');
        ylabel('Мгновенный ток, кА');
        title(sprintf('Переходный процесс (I_k = %.2f кА, tau = %.4f с)', Ik, tau));
        legend(leg, 'location', 'northeast');
    end

    outDir = fullfile(rootDir, 'results', 'figures');
    baseName = sprintf('oscillogram_Ik%.2fkA', Ik);
    baseName = strrep(baseName, '.', 'p');
    outPng = fullfile(outDir, [baseName '.png']);
    outEps = fullfile(outDir, [baseName '.eps']);

    save_figure_highres(gcf, outPng, outEps);

    legacyPng = fullfile(outDir, 'oscillogram.png');
    try
        copyfile(outPng, legacyPng);
    catch
        save_figure_highres(gcf, legacyPng, '');
    end

    fprintf('  Осциллограмма сохранена: %s\n', outPng);
    outPath = outPng;
end

function i = phase_current(Im, omega, t, tau, psi)
    i = Im * (sin(omega * t + psi) - sin(psi) * exp(-t / tau));
end

function save_figure_highres(hFig, pngPath, epsPath)
    dpi = '-r300';
    if exist('OCTAVE_VERSION', 'builtin') ~= 0
        try
            print(hFig, pngPath, '-dpng', dpi);
        catch
            saveas(hFig, pngPath);
        end
        if ~isempty(epsPath)
            try
                print(hFig, epsPath, '-depsc2');
            catch
            end
        end
    else
        try
            exportgraphics(hFig, pngPath, 'Resolution', 300);
        catch
            print(hFig, pngPath, '-dpng', dpi);
        end
        if ~isempty(epsPath)
            try
                print(hFig, epsPath, '-depsc2');
            catch
            end
        end
    end
end
