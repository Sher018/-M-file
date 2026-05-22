function sc_octave_init()
    % SC_OCTAVE_INIT Настройка среды GNU Octave для комплекса SC_Calculator.
    % Вызывайте из run_sc_octave, oct_sc_menu или вручную один раз за сессию.

    if exist('OCTAVE_VERSION', 'builtin') == 0
        return;
    end

    more off;

    try
        pkg('load', 'io');
    catch err
        error(['Octave: требуется пакет io для чтения Excel.\n' ...
               'Выполните в Octave:\n  pkg install -forge io\n  pkg load io\n' ...
               'Ошибка: %s'], err.message);
    end

    toolkits = {'qt', 'fltk', 'gnuplot'};
    for k = 1:numel(toolkits)
        try
            graphics_toolkit(toolkits{k});
            return;
        catch
        end
    end
end
